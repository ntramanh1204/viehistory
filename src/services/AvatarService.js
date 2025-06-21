export class AvatarService {
    /**
     * Tạo avatar URL từ DiceBear API
     */
    static generateAvatar(seed, size = 100) {
        const baseUrl = 'https://api.dicebear.com/7.x/avataaars/svg';
        const params = new URLSearchParams({
            seed: seed,
            size: size,
            radius: 10
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Tạo avatar cho user đã đăng nhập
     */
    static getUserAvatar(user, size = 100) {
        // Chỉ tạo Avataaars cho user đã đăng nhập
        if (!user || user.isAnonymous) {
            return null; // Trả về null để sử dụng text avatar
        }
        
        const seed = user.displayName || user.email || 'user';
        return this.generateAvatar(seed, size);
    }

    /**
     * Text avatar cho user chưa đăng nhập hoặc anonymous
     */
    static getInitials(name) {
        if (!name) return 'A'; // Mặc định là 'A' cho anonymous
        return name.charAt(0).toUpperCase();
    }

    /**
     * Kiểm tra có nên hiển thị Avataaars hay không
     */
    static shouldUseAvataaars(user) {
        return user && !user.isAnonymous;
    }
}