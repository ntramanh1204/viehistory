import { 
    collection, 
    addDoc, 
    getDocs,
    doc,
    updateDoc,
    increment,
    query, 
    orderBy, 
    limit,
    where,
    serverTimestamp,
    arrayUnion,
    getDoc,
    deleteDoc,
    startAfter
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

export class DatabaseService {
    constructor() {
        this.postsCollection = 'posts';
        this.commentsCollection = 'comments';
        this.usersCollection = 'users';
    }

    // ==================== POSTS ====================
    
    /**
     * Tạo post mới (cần auth)
     */
    async createPost(postData, user) {
        if (!user) {
            throw new Error('Cần đăng nhập để đăng bài');
        }

        try {
            const post = {
                content: postData.content,
                topic: postData.topic || null,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || null,
                    isAnonymous: user.isAnonymous || false
                },
                stats: {
                    likes: 0,
                    comments: 0,
                    views: 0,
                    shares: 0
                },
                metadata: {
                    hashtags: this.extractHashtags(postData.content),
                    mentions: this.extractMentions(postData.content),
                    wordCount: postData.content.split(' ').length
                },
                status: 'published',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, this.postsCollection), post);
            
            // Update user stats
            await this.updateUserStats(user.uid, 'postsCount', 1);
            
            console.log('✅ Post created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error creating post:', error);
            throw new Error('Không thể tạo bài viết. Vui lòng thử lại.');
        }
    }

    /**
     * Lấy posts (không cần auth)
     */
    async getPosts(limitCount = 20, lastDoc = null) {
        try {
            let q = query(
                collection(db, this.postsCollection),
                where('status', '==', 'published'),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            // Pagination support
            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }
            
            const querySnapshot = await getDocs(q);
            const posts = [];
            
            querySnapshot.forEach((doc) => {
                posts.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                });
            });
            
            return {
                posts,
                lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
            };
        } catch (error) {
            console.error('❌ Error getting posts:', error);
            throw new Error('Không thể tải bài viết.');
        }
    }

    /**
     * Tăng view count cho post
     */
    async incrementPostViews(postId) {
        try {
            const postRef = doc(db, this.postsCollection, postId);
            await updateDoc(postRef, {
                'stats.views': increment(1)
            });
        } catch (error) {
            console.error('❌ Error incrementing views:', error);
        }
    }

    // ==================== COMMENTS ====================
    
    /**
     * Tạo comment mới (cần auth)
     */
    async createComment(commentData, user) {
        if (!user) {
            throw new Error('Cần đăng nhập để bình luận');
        }

        try {
            const comment = {
                postId: commentData.postId,
                parentId: commentData.parentId || null, // null = top-level comment
                content: commentData.content,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || null,
                    isAnonymous: user.isAnonymous || false
                },
                stats: {
                    likes: 0,
                    replies: 0
                },
                status: 'published',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, this.commentsCollection), comment);
            
            // Update post comment count
            const postRef = doc(db, this.postsCollection, commentData.postId);
            await updateDoc(postRef, {
                'stats.comments': increment(1),
                updatedAt: serverTimestamp()
            });

            // Update user stats
            await this.updateUserStats(user.uid, 'commentsCount', 1);
            
            // If this is a reply, update parent comment
            if (commentData.parentId) {
                const parentRef = doc(db, this.commentsCollection, commentData.parentId);
                await updateDoc(parentRef, {
                    'stats.replies': increment(1)
                });
            }
            
            console.log('✅ Comment created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error creating comment:', error);
            throw new Error('Không thể tạo bình luận.');
        }
    }

    /**
     * Lấy comments của post (không cần auth)
     */
    async getComments(postId, limitCount = 50) {
        try {
            const q = query(
                collection(db, this.commentsCollection),
                where('postId', '==', postId),
                where('status', '==', 'published'),
                orderBy('createdAt', 'asc'),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            const comments = [];
            
            querySnapshot.forEach((doc) => {
                comments.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date()
                });
            });
            
            // Organize into threaded structure
            return this.organizeComments(comments);
        } catch (error) {
            console.error('❌ Error getting comments:', error);
            throw new Error('Không thể tải bình luận.');
        }
    }

    /**
     * Organize flat comments into threaded structure
     */
    organizeComments(comments) {
        const commentMap = new Map();
        const topLevel = [];

        // First pass: create map of all comments
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });

        // Second pass: organize hierarchy
        comments.forEach(comment => {
            if (comment.parentId && commentMap.has(comment.parentId)) {
                commentMap.get(comment.parentId).replies.push(comment);
            } else {
                topLevel.push(comment);
            }
        });

        return topLevel;
    }

    // ==================== LIKES ====================
    
    /**
     * Toggle like cho post/comment (cần auth)
     */
    async toggleLike(itemType, itemId, user) {
        if (!user) {
            throw new Error('Cần đăng nhập để thích bài viết');
        }

        try {
            const likeId = `${user.uid}_${itemId}`;
            const likesRef = collection(db, 'likes');
            const likeQuery = query(
                likesRef,
                where('userId', '==', user.uid),
                where('itemId', '==', itemId),
                where('itemType', '==', itemType)
            );
            
            const likeSnapshot = await getDocs(likeQuery);
            const itemRef = doc(db, itemType === 'post' ? this.postsCollection : this.commentsCollection, itemId);
            
            if (likeSnapshot.empty) {
                // Add like
                await addDoc(likesRef, {
                    userId: user.uid,
                    itemId: itemId,
                    itemType: itemType,
                    createdAt: serverTimestamp()
                });
                
                await updateDoc(itemRef, {
                    'stats.likes': increment(1)
                });
                
                return { liked: true, action: 'liked' };
            } else {
                // Remove like
                const likeDoc = likeSnapshot.docs[0];
                await deleteDoc(doc(db, 'likes', likeDoc.id));
                
                await updateDoc(itemRef, {
                    'stats.likes': increment(-1)
                });
                
                return { liked: false, action: 'unliked' };
            }
        } catch (error) {
            console.error('❌ Error toggling like:', error);
            throw new Error('Không thể thực hiện hành động này.');
        }
    }

    /**
     * Check if user liked item
     */
    async checkUserLike(itemType, itemId, userId) {
        if (!userId) return false;
        
        try {
            const likeQuery = query(
                collection(db, 'likes'),
                where('userId', '==', userId),
                where('itemId', '==', itemId),
                where('itemType', '==', itemType)
            );
            
            const likeSnapshot = await getDocs(likeQuery);
            return !likeSnapshot.empty;
        } catch (error) {
            console.error('❌ Error checking like:', error);
            return false;
        }
    }

    // ==================== UTILITIES ====================
    
    /**
     * Update user statistics
     */
    async updateUserStats(userId, field, increment) {
        try {
            const userRef = doc(db, this.usersCollection, userId);
            await updateDoc(userRef, {
                [`stats.${field}`]: increment(increment),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Error updating user stats:', error);
        }
    }

    /**
     * Extract hashtags from content
     */
    extractHashtags(content) {
        const hashtagRegex = /#(\w+)/g;
        const hashtags = [];
        let match;
        
        while ((match = hashtagRegex.exec(content)) !== null) {
            hashtags.push(match[1].toLowerCase());
        }
        
        return hashtags;
    }

    /**
     * Extract mentions from content
     */
    extractMentions(content) {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1].toLowerCase());
        }
        
        return mentions;
    }
}

// Create singleton instance
export const dbService = new DatabaseService();