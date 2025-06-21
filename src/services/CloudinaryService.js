export class CloudinaryService {
    constructor() {
        this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        
        if (!this.cloudName || !this.uploadPreset) {
            console.warn('⚠️ Cloudinary config missing');
        }
    }

        /**
     * Upload media (ảnh hoặc video) lên Cloudinary
     */
    async uploadMedia(file, folder = 'media') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('folder', `viehistory/${folder}`);
            
            // Tạo tên file unique
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            formData.append('public_id', `${folder}/${fileName}`);

            // ✅ THÊM: Xác định endpoint dựa trên loại file
            const isVideo = file.type.startsWith('video/');
            const endpoint = isVideo ? 'video/upload' : 'image/upload';

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/${endpoint}`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const result = await response.json();
            return result.secure_url;

        } catch (error) {
            console.error('❌ Cloudinary upload error:', error);
            throw new Error(`Không thể upload ${file.type.startsWith('video/') ? 'video' : 'hình ảnh'}. ${error.message}`);
        }
    }

    /**
     * Upload hình ảnh lên Cloudinary
     */
    async uploadImage(file, folder = 'blog') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('folder', `viehistory/${folder}`);
            
            // Tạo tên file unique
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            formData.append('public_id', `${folder}/${fileName}`);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            return result.secure_url;

        } catch (error) {
            console.error('❌ Cloudinary upload error:', error);
            throw new Error('Không thể upload hình ảnh. Vui lòng thử lại.');
        }
    }

    /**
     * Tạo URL với transformation cho blog thumbnail
     */
    getBlogThumbnail(url) {
        if (!url || !url.includes('cloudinary.com')) return url;
        return url.replace('/upload/', '/upload/w_400,h_250,c_fill,q_auto,f_auto/');
    }

    /**
     * Tạo URL cho featured image
     */
    getFeaturedImage(url) {
        if (!url || !url.includes('cloudinary.com')) return url;
        return url.replace('/upload/', '/upload/w_800,h_400,c_fill,q_auto,f_auto/');
    }

    /**
     * Tạo URL cho blog cover
     */
    getBlogCover(url) {
        if (!url || !url.includes('cloudinary.com')) return url;
        return url.replace('/upload/', '/upload/w_1200,h_600,c_fill,q_auto,f_auto/');
    }

    /**
     * Tạo URL cho popular thumbnail
     */
    getPopularThumbnail(url) {
        if (!url || !url.includes('cloudinary.com')) return url;
        return url.replace('/upload/', '/upload/w_150,h_100,c_fill,q_auto,f_auto/');
    }

    /**
     * Validate file trước khi upload
     */
    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (file.size > maxSize) {
            throw new Error('File quá lớn. Kích thước tối đa là 10MB.');
        }

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận JPG, PNG, GIF, WebP.');
        }

        return true;
    }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();