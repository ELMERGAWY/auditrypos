// Google/YouTube API Integration
// Handles posting and analytics for Google and YouTube

export interface YouTubeVideoResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface YouTubeChannelStats {
  viewCount: number;
  subscriberCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean;
}

export interface YouTubeVideoStats {
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  favoriteCount: number;
  commentCount: number;
}

class GoogleYouTubeAPI {
  private accessToken: string;
  private channelId?: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Set YouTube Channel ID
  setChannelId(channelId: string) {
    this.channelId = channelId;
  }

  // Get YouTube Channel Info
  async getYouTubeChannel(): Promise<any> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.items && data.items.length > 0) {
        this.channelId = data.items[0].id;
        return data.items[0];
      }

      throw new Error('No channel found');
    } catch (error: any) {
      console.error('Failed to fetch YouTube channel:', error);
      throw error;
    }
  }

  // Upload Video to YouTube
  async uploadVideo(
    videoFile: File,
    title: string,
    description: string,
    tags: string[] = [],
    privacyStatus: 'public' | 'private' | 'unlisted' = 'public',
    scheduledTime?: Date
  ): Promise<YouTubeVideoResponse> {
    try {
      // First, create the video resource
      const metadata: any = {
        snippet: {
          title,
          description,
          tags,
          categoryId: '22', // People & Blogs
          defaultLanguage: 'ar',
          defaultAudioLanguage: 'ar',
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      };

      if (scheduledTime) {
        metadata.status.publishAt = scheduledTime.toISOString();
        metadata.status.privacyStatus = 'private';
      }

      // Initialize upload
      const initResponse = await fetch(
        `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.error?.message || 'Failed to initialize upload');
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL returned');
      }

      // Upload the video file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
        },
        body: videoFile,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error?.message || 'Failed to upload video');
      }

      const uploadData = await uploadResponse.json();
      return { id: uploadData.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Update Video Metadata
  async updateVideoMetadata(
    videoId: string,
    title?: string,
    description?: string,
    tags?: string[]
  ): Promise<boolean> {
    try {
      const metadata: any = { id: videoId };
      
      if (title || description || tags) {
        metadata.snippet = {};
        if (title) metadata.snippet.title = title;
        if (description) metadata.snippet.description = description;
        if (tags) metadata.snippet.tags = tags;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&access_token=${this.accessToken}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message);
      }

      return true;
    } catch (error: any) {
      console.error('Failed to update video metadata:', error);
      throw error;
    }
  }

  // Get Channel Statistics
  async getChannelStatistics(): Promise<YouTubeChannelStats> {
    if (!this.channelId) {
      throw new Error('Channel ID is required');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${this.channelId}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.items && data.items.length > 0) {
        return data.items[0].statistics;
      }

      throw new Error('No statistics found');
    } catch (error: any) {
      console.error('Failed to fetch channel statistics:', error);
      throw error;
    }
  }

  // Get Video Statistics
  async getVideoStatistics(videoId: string): Promise<YouTubeVideoStats> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.items && data.items.length > 0) {
        return data.items[0].statistics;
      }

      throw new Error('No statistics found');
    } catch (error: any) {
      console.error('Failed to fetch video statistics:', error);
      throw error;
    }
  }

  // Get Channel Videos
  async getChannelVideos(limit: number = 10): Promise<any[]> {
    if (!this.channelId) {
      throw new Error('Channel ID is required');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${this.channelId}&maxResults=${limit}&order=date&type=video&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.items || [];
    } catch (error: any) {
      console.error('Failed to fetch channel videos:', error);
      throw error;
    }
  }

  // Delete Video
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&access_token=${this.accessToken}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message);
      }

      return true;
    } catch (error: any) {
      console.error('Failed to delete video:', error);
      throw error;
    }
  }

  // Add Comment to Video
  async addComment(videoId: string, text: string): Promise<string> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              topLevelComment: {
                snippet: {
                  textOriginal: text,
                  videoId: videoId,
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message);
      }

      const data = await response.json();
      return data.id;
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  // Get Video Comments
  async getVideoComments(videoId: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=${limit}&order=time&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.items || [];
    } catch (error: any) {
      console.error('Failed to fetch video comments:', error);
      throw error;
    }
  }
}

export default GoogleYouTubeAPI;
