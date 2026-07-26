// Facebook/Instagram Graph API Integration
// Handles posting and analytics for Facebook and Instagram

export interface FacebookPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface InstagramPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface FacebookPageInsights {
  page_impressions: number;
  page_impressions_unique: number;
  page_post_impressions: number;
  page_post_engagements: number;
  page_fan_adds: number;
  page_fan_removes: number;
}

export interface InstagramInsights {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

class FacebookInstagramAPI {
  private accessToken: string;
  private pageId?: string;
  private instagramAccountId?: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Set Facebook Page ID
  setPageId(pageId: string) {
    this.pageId = pageId;
  }

  // Set Instagram Business Account ID
  setInstagramAccountId(accountId: string) {
    this.instagramAccountId = accountId;
  }

  // Get Facebook Pages for the user
  async getFacebookPages(): Promise<any[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch Facebook pages:', error);
      throw error;
    }
  }

  // Get Instagram Business Accounts
  async getInstagramBusinessAccounts(): Promise<any[]> {
    if (!this.pageId) {
      throw new Error('Page ID is required to fetch Instagram accounts');
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}?fields=instagram_business_account&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.instagram_business_account) {
        return [];
      }

      // Fetch Instagram account details
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${data.instagram_business_account}?fields=username,profile_picture_url,followers_count&access_token=${this.accessToken}`
      );
      const igData = await igResponse.json();

      return igData.error ? [] : [igData];
    } catch (error: any) {
      console.error('Failed to fetch Instagram accounts:', error);
      throw error;
    }
  }

  // Post to Facebook Page
  async postToFacebookPage(
    message: string,
    imageUrl?: string,
    linkUrl?: string,
    scheduledTime?: Date
  ): Promise<FacebookPostResponse> {
    if (!this.pageId) {
      return { id: '', success: false, error: 'Page ID is required' };
    }

    try {
      const endpoint = `https://graph.facebook.com/v18.0/${this.pageId}/feed`;
      const body: any = {
        message,
        access_token: this.accessToken,
        published: !scheduledTime,
      };

      if (scheduledTime) {
        body.scheduled_publish_time = Math.floor(scheduledTime.getTime() / 1000);
      }

      if (imageUrl) {
        // First, upload the image
        const uploadResponse = await fetch(
          `https://graph.facebook.com/v18.0/${this.pageId}/photos?url=${encodeURIComponent(imageUrl)}&access_token=${this.accessToken}&published=false`,
          { method: 'POST' }
        );
        const uploadData = await uploadResponse.json();

        if (uploadData.error) {
          throw new Error(uploadData.error.message);
        }

        body.attached_media = [{ media_fbid: uploadData.id }];
      }

      if (linkUrl) {
        body.link = linkUrl;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        return { id: '', success: false, error: data.error.message };
      }

      return { id: data.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Post to Instagram
  async postToInstagram(
    imageUrl: string,
    caption: string,
    isCarousel: boolean = false
  ): Promise<InstagramPostResponse> {
    if (!this.instagramAccountId) {
      return { id: '', success: false, error: 'Instagram Business Account ID is required' };
    }

    try {
      // Create a container for the media
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${this.accessToken}`,
        { method: 'POST' }
      );
      const containerData = await containerResponse.json();

      if (containerData.error) {
        throw new Error(containerData.error.message);
      }

      // Publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media_publish?creation_id=${containerData.id}&access_token=${this.accessToken}`,
        { method: 'POST' }
      );
      const publishData = await publishResponse.json();

      if (publishData.error) {
        throw new Error(publishData.error.message);
      }

      return { id: publishData.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Post Instagram Story
  async postInstagramStory(imageUrl: string): Promise<InstagramPostResponse> {
    if (!this.instagramAccountId) {
      return { id: '', success: false, error: 'Instagram Business Account ID is required' };
    }

    try {
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media?image_url=${encodeURIComponent(imageUrl)}&media_type=STORIES&access_token=${this.accessToken}`,
        { method: 'POST' }
      );
      const containerData = await containerResponse.json();

      if (containerData.error) {
        throw new Error(containerData.error.message);
      }

      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media_publish?creation_id=${containerData.id}&access_token=${this.accessToken}`,
        { method: 'POST' }
      );
      const publishData = await publishResponse.json();

      if (publishData.error) {
        throw new Error(publishData.error.message);
      }

      return { id: publishData.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Get Facebook Page Insights
  async getFacebookPageInsights(
    since?: Date,
    until?: Date
  ): Promise<FacebookPageInsights> {
    if (!this.pageId) {
      throw new Error('Page ID is required');
    }

    const metrics = [
      'page_impressions',
      'page_impressions_unique',
      'page_post_impressions',
      'page_post_engagements',
      'page_fan_adds',
      'page_fan_removes',
    ];

    const period = 'day';
    const dateParam = since && until
      ? `&since=${Math.floor(since.getTime() / 1000)}&until=${Math.floor(until.getTime() / 1000)}`
      : '';

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/insights?metric=${metrics.join(',')}&period=${period}${dateParam}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const insights: FacebookPageInsights = {
        page_impressions: 0,
        page_impressions_unique: 0,
        page_post_impressions: 0,
        page_post_engagements: 0,
        page_fan_adds: 0,
        page_fan_removes: 0,
      };

      if (data.data) {
        data.data.forEach((metric: any) => {
          const value = metric.values[0]?.value || 0;
          insights[metric.name as keyof FacebookPageInsights] = value;
        });
      }

      return insights;
    } catch (error: any) {
      console.error('Failed to fetch Facebook insights:', error);
      throw error;
    }
  }

  // Get Instagram Insights
  async getInstagramInsights(
    since?: Date,
    until?: Date
  ): Promise<InstagramInsights> {
    if (!this.instagramAccountId) {
      throw new Error('Instagram Business Account ID is required');
    }

    const metrics = [
      'impressions',
      'reach',
      'engagement',
      'likes',
      'comments',
    ];

    const period = 'day';
    const dateParam = since && until
      ? `&since=${Math.floor(since.getTime() / 1000)}&until=${Math.floor(until.getTime() / 1000)}`
      : '';

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/insights?metric=${metrics.join(',')}&period=${period}${dateParam}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const insights: InstagramInsights = {
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };

      if (data.data) {
        data.data.forEach((metric: any) => {
          const value = metric.values[0]?.value || 0;
          insights[metric.name as keyof InstagramInsights] = value;
        });
      }

      return insights;
    } catch (error: any) {
      console.error('Failed to fetch Instagram insights:', error);
      throw error;
    }
  }

  // Get Facebook Page Posts
  async getFacebookPosts(limit: number = 10): Promise<any[]> {
    if (!this.pageId) {
      throw new Error('Page ID is required');
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/posts?fields=id,message,created_time,permalink_url,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch Facebook posts:', error);
      throw error;
    }
  }

  // Get Instagram Media
  async getInstagramMedia(limit: number = 10): Promise<any[]> {
    if (!this.instagramAccountId) {
      throw new Error('Instagram Business Account ID is required');
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch Instagram media:', error);
      throw error;
    }
  }

  // Delete Facebook Post
  async deleteFacebookPost(postId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?access_token=${this.accessToken}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.success === true;
    } catch (error: any) {
      console.error('Failed to delete Facebook post:', error);
      throw error;
    }
  }

  // Delete Instagram Media
  async deleteInstagramMedia(mediaId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?access_token=${this.accessToken}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.success === true;
    } catch (error: any) {
      console.error('Failed to delete Instagram media:', error);
      throw error;
    }
  }
}

export default FacebookInstagramAPI;
