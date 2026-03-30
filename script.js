(function(){
    // DOM 元素
    const fileInput = document.getElementById('imageUpload');
    const originalPreviewImg = document.getElementById('originalPreview');
    const originalInfoDiv = document.getElementById('originalInfo');
    const targetWidthInput = document.getElementById('targetWidth');
    const targetHeightInput = document.getElementById('targetHeight');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resultCanvas = document.getElementById('resultCanvas');
    const uploadTip = document.getElementById('uploadTip');

    // 全局存储原始图片对象
    let originalImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let currentObjectUrl = null;

    // 辅助显示提示信息
    function showUploadTip(msg, isError = true) {
        uploadTip.textContent = msg;
        uploadTip.style.display = 'block';
        if(isError) {
            uploadTip.style.backgroundColor = '#fff0e6';
            uploadTip.style.color = '#b45309';
        } else {
            uploadTip.style.backgroundColor = '#e6f7ec';
            uploadTip.style.color = '#2b6e3b';
        }
        setTimeout(() => {
            if(uploadTip.style.display === 'block') uploadTip.style.display = 'none';
        }, 3000);
    }

    // 清除之前的 ObjectURL
    function revokeOldUrl() {
        if(currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
    }

    // 重置处理结果区域
    function resetResultArea() {
        const ctx = resultCanvas.getContext('2d');
        ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("等待生成...", resultCanvas.width/2, resultCanvas.height/2);
        document.getElementById('resultInfo').innerHTML = `📌 未生成结果 · 设置尺寸后点击「等比例缩放」`;
        downloadBtn.disabled = true;
    }

    // 更新原始图片信息
    function updateOriginalInfo(width, height) {
        originalInfoDiv.innerHTML = `📷 图片信息: ${width} × ${height} 像素<br>🔄 等比例缩放后，将完整适配至目标框内（白色背景）`;
    }

    // 上传图片处理
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;

        if(!file.type.match('image.*')) {
            showUploadTip('请选择有效的图片文件 (jpg/png/webp等)');
            return;
        }

        if(file.size > 20 * 1024 * 1024) {
            showUploadTip('图片过大 ( >20MB )，可能造成卡顿，建议压缩后上传', true);
        }

        revokeOldUrl();
        const objectUrl = URL.createObjectURL(file);
        currentObjectUrl = objectUrl;
        originalPreviewImg.src = objectUrl;

        const img = new Image();
        img.onload = function() {
            originalWidth = img.width;
            originalHeight = img.height;
            originalImage = img;
            updateOriginalInfo(originalWidth, originalHeight);
            originalInfoDiv.innerHTML = `📷 图片信息: ${originalWidth} × ${originalHeight} 像素<br>✅ 已就绪，可进行缩放处理`;
            showUploadTip(`图片加载成功: ${originalWidth} x ${originalHeight}`, false);
            resetResultArea();
            downloadBtn.disabled = true;
        };
        img.onerror = function() {
            showUploadTip('图片加载失败，请尝试其他图片', true);
            originalImage = null;
            originalInfoDiv.innerHTML = `⚠️ 图片加载失败，请重新上传`;
            originalPreviewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 8h-4v4h-4v-4H6V9h4V5h4v4h4v2z'/%3E%3C/svg%3E";
            revokeOldUrl();
            currentObjectUrl = null;
            resetResultArea();
        };
        img.src = objectUrl;
    });

    // 核心: 等比例缩放至目标尺寸 (contain模式，居中绘制白色背景)
    function processScaleToTarget() {
        if(!originalImage || originalWidth === 0 || originalHeight === 0) {
            showUploadTip('请先上传图片文件', true);
            return false;
        }

        let targetW = parseInt(targetWidthInput.value, 10);
        let targetH = parseInt(targetHeightInput.value, 10);

        if(isNaN(targetW) || targetW <= 0) {
            targetW = 400;
            targetWidthInput.value = 400;
            showUploadTip('宽度无效，已重置为 400px', false);
        }
        if(isNaN(targetH) || targetH <= 0) {
            targetH = 300;
            targetHeightInput.value = 300;
            showUploadTip('高度无效，已重置为 300px', false);
        }

        const MAX_SIZE = 3500;
        if(targetW > MAX_SIZE) {
            targetW = MAX_SIZE;
            targetWidthInput.value = MAX_SIZE;
            showUploadTip(`宽度超出安全限制，已调整为 ${MAX_SIZE}px`, false);
        }
        if(targetH > MAX_SIZE) {
            targetH = MAX_SIZE;
            targetHeightInput.value = MAX_SIZE;
            showUploadTip(`高度超出安全限制，已调整为 ${MAX_SIZE}px`, false);
        }

        const imgRatio = originalWidth / originalHeight;
        const targetRatio = targetW / targetH;
        let drawWidth, drawHeight;

        if(imgRatio > targetRatio) {
            drawWidth = targetW;
            drawHeight = targetW / imgRatio;
        } else {
            drawHeight = targetH;
            drawWidth = targetH * imgRatio;
        }

        const offsetX = (targetW - drawWidth) / 2;
        const offsetY = (targetH - drawHeight) / 2;

        resultCanvas.width = targetW;
        resultCanvas.height = targetH;
        const ctx = resultCanvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        try {
            ctx.drawImage(originalImage, offsetX, offsetY, drawWidth, drawHeight);
        } catch(err) {
            console.error('绘制失败', err);
            showUploadTip('图片绘制失败，请重试', true);
            return false;
        }

        const resultInfoText = `✅ 处理完成 | 最终输出尺寸: ${targetW} × ${targetH} px<br>🎨 图片实际绘制区域: ${drawWidth.toFixed(1)} × ${drawHeight.toFixed(1)} px (等比例居中)`;
        document.getElementById('resultInfo').innerHTML = resultInfoText;
        downloadBtn.disabled = false;
        return true;
    }

    processBtn.addEventListener('click', function() {
        if(!originalImage) {
            showUploadTip('请先上传一张图片', true);
            return;
        }
        processScaleToTarget();
    });

    function downloadProcessedImage() {
        if(downloadBtn.disabled) {
            showUploadTip('没有可下载的图片，请先生成缩放结果', true);
            return;
        }
        if(resultCanvas.width === 0 || resultCanvas.height === 0) {
            showUploadTip('画布无效，请重新生成', true);
            return;
        }
        try {
            const dataURL = resultCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            const timestamp = new Date().getTime();
            let fileName = `scaled_${resultCanvas.width}x${resultCanvas.height}_${timestamp}.png`;
            if(fileInput.files && fileInput.files[0]) {
                const originalName = fileInput.files[0].name;
                const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || 'image';
                fileName = `${nameWithoutExt}_scaled_${resultCanvas.width}x${resultCanvas.height}.png`;
            }
            link.download = fileName;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showUploadTip('下载已开始！', false);
        } catch(e) {
            console.error(e);
            showUploadTip('生成图片失败，可能是浏览器限制', true);
        }
    }

    downloadBtn.addEventListener('click', downloadProcessedImage);

    function sanitizeInputs() {
        let w = parseInt(targetWidthInput.value, 10);
        let h = parseInt(targetHeightInput.value, 10);
        if(!isNaN(w) && w > 3500) {
            targetWidthInput.value = 3500;
            showUploadTip('宽度上限3500px，已自动修正', false);
        }
        if(!isNaN(h) && h > 3500) {
            targetHeightInput.value = 3500;
            showUploadTip('高度上限3500px，已自动修正', false);
        }
        if(!isNaN(w) && w < 10) {
            targetWidthInput.value = 10;
            showUploadTip('最小宽度为10px', false);
        }
        if(!isNaN(h) && h < 10) {
            targetHeightInput.value = 10;
            showUploadTip('最小高度为10px', false);
        }
    }

    targetWidthInput.addEventListener('blur', sanitizeInputs);
    targetHeightInput.addEventListener('blur', sanitizeInputs);

    // 初始重置
    resetResultArea();
    originalInfoDiv.innerHTML = `📂 请点击「选择图片」上传您的照片<br>支持 JPG / PNG / WebP`;

    window.addEventListener('beforeunload', function() {
        if(currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
        }
    });
})();
