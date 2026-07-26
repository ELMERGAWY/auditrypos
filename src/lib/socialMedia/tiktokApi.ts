// TikTok API Integration
// Handles posting and analytics for TikTok

export interface TikTokVideoResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface TikTokUserStats {
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export interface TikTokVideoStats {
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  play_count: number;
}

class TikTokAPI {
  private accessToken: string;
  private openId?: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Set TikTok Open ID
  setOpenId(openId: string) {
    this.openId = openId;
  }

  // Get TikTok User Info
  async getUserInfo(): Promise<any> {
    try {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/user/info/',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      if (data.data?.user) {
        this.openId = data.data.user.open_id;
        return data.data.user;
      }

      throw new Error('No user data found');
    } catch (error: any) {
      console.error('Failed to fetch TikTok user info:', error);
      throw error;
    }
  }

  // Upload Video to TikTok
  async uploadVideo(
    videoFile: File,
    caption: string,
    hashtags: string[] = [],
    privacyLevel: 'public' | 'private' | 'unlisted' = 'public'
  ): Promise<TikTokVideoResponse> {
    if (!this.openId) {
      return { id: '', success: false, error: 'Open ID is required' };
    }

    try {
      // Initialize video upload
      const initResponse = await fetch(
        'https://open.tiktokapis.com/v2/video/upload/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: {
              type: 'user_to_video',
              open_id: this.openId,
            },
            video: {
              file_size: videoFile.size,
            },
          }),
        }
      );

      const initData = await initResponse.json();

      if (initData.error?.code) {
        throw new Error(initData.error.message);
      }

      const uploadUrl = initData.data?.upload_url;
      const videoId = initData.data?.video_id;

      if (!uploadUrl || !videoId) {
        throw new Error('Failed to get upload URL or video ID');
      }

      // Upload the video file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Range': `bytes 0-${videoFile.size - 1}/${videoFile.size}`,
        },
        body: videoFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      // Publish the video
      const publishResponse = await fetch(
        'https://open.tiktokapis.com/v2/video/publish/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: {
              type: 'user_to_video',
              open_id: this.openId,
            },
            video: {
              video_id: videoId,
            },
            post_info: {
              title: caption,
              privacy_level: privacyLevel,
              disable_comment: false,
              disable_duet: false,
              disable_stitch: false,
              hashtag: hashtags.map(tag => ({ tag_name: tag })),
            },
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error?.code) {
        throw new Error(publishData.error.message);
      }

      return { id: videoId, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Get User Statistics
  async getUserStatistics(): Promise<TikTokUserStats> {
    if (!this.openId) {
      throw new Error('Open ID is required');
    }

    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/user/stats/?open_id=${this.openId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      if (data.data?.stats) {
        return data.data.stats;
      }

      throw new Error('No statistics found');
    } catch (error: any) {
      console.error('Failed to fetch user statistics:', error);
      throw error;
    }
  }

  // Get Video Statistics
  async getVideoStatistics(videoId: string): Promise<TikTokVideoStats> {
    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/video/stats/?video_id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      if (data.data?.stats) {
        return data.data.stats;
      }

      throw new Error('No statistics found');
    } catch (error: any) {
      console.error('Failed to fetch video statistics:', error);
      throw error;
    }
  }

  // Get User Videos
  async getUserVideos(limit: number = 10): Promise<any[]> {
    if (!this.openId) {
      throw new Error('Open ID is required');
    }

    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/video/list/?open_id=${this.openId}&max_count=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.videos || [];
    } catch (error: any) {
      console.error('Failed to fetch user videos:', error);
      throw error;
    }
  }

  // Delete Video
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/delete/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: {
              type: 'user_to_video',
              open_id: this.openId,
            },
            video: {
              video_id: videoId,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.deleted === true;
    } catch (error: any) {
      console.error('Failed to delete video:', error);
      throw error;
    }
  }

  // Get Video Comments
  async getVideoComments(videoId: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/video/comment/list/?video_id=${videoId}&max_count=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.comments || [];
    } catch (error: any) {
      console.error('Failed to fetch video comments:', error);
      throw error;
    }
  }

  // Reply to Comment
  async replyToComment(commentId: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/comment/reply/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment_id: commentId,
            text: text,
          }),
        }
      );

      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.reply_id !== undefined;
    } catch (error: any) {
      console.error('Failed to reply to comment:', error);
      throw error;
    }
  }

  // Like Video
  async likeVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/like/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: {
              type: 'user_to_video',
              open_id: this.openId,
            },
            video: {
              video_id: videoId,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.liked === true;
    } catch (error: any) {
      console.error('Failed to like video:', error);
      throw error;
    }
  }

  // Unlike Video
  async unlikeVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        'https://open.tiktokapis.com/v2/video/unlike/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: {
              type: 'user_to_video',
              open_id: this.openId,
            },
            video: {
              video_id: videoId,
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error?.code) {
        throw new Error(data.error.message);
      }

      return data.data?.unliked === true;
    } catch (error: any) {
      console.error('Failed to unlike video:', error);
      throw error;
    }
  }
}

export default TikTokAPI;
