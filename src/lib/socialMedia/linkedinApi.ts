// LinkedIn API Integration
// Handles posting and analytics for LinkedIn

export interface LinkedInPostResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface LinkedInProfileStats {
  numConnections: number;
  profileViews: number;
  searchAppearances: number;
}

class LinkedInAPI {
  private accessToken: string;
  private personUrn?: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Set LinkedIn Person URN
  setPersonUrn(urn: string) {
    this.personUrn = urn;
  }

  // Get LinkedIn Profile
  async getLinkedInProfile(): Promise<any> {
    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      return data;
    } catch (error: any) {
      console.error('Failed to fetch LinkedIn profile:', error);
      throw error;
    }
  }

  // Get LinkedIn Person URN
  async getPersonUrn(): Promise<string> {
    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      this.personUrn = data.id;
      return data.id;
    } catch (error: any) {
      console.error('Failed to fetch person URN:', error);
      throw error;
    }
  }

  // Post to LinkedIn (Text)
  async postText(text: string): Promise<LinkedInPostResponse> {
    if (!this.personUrn) {
      return { id: '', success: false, error: 'Person URN is required' };
    }

    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: this.personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text,
                },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      return { id: data.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Post to LinkedIn (Image)
  async postImage(text: string, imageUrl: string): Promise<LinkedInPostResponse> {
    if (!this.personUrn) {
      return { id: '', success: false, error: 'Person URN is required' };
    }

    try {
      // Register the image upload
      const registerResponse = await fetch(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              owner: this.personUrn,
              recipes: [
                {
                  'com.linkedin.digitalmedia.assetasset': {
                    'com.linkedin.digitalmedia.mediaasset.Image': {
                      imageType: 'STRAIGHT_UPLOAD',
                    },
                  },
                },
              ],
              serviceVersion: '2.0.0',
            },
          }),
        }
      );

      const registerData = await registerResponse.json();

      if (registerData.error) {
        throw new Error(registerData.error_description);
      }

      const uploadUrl = registerData.value?.uploadUrl;
      const assetUrn = registerData.value?.asset;

      if (!uploadUrl || !assetUrn) {
        throw new Error('Failed to get upload URL or asset URN');
      }

      // Upload the image binary
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: imageBlob,
      });

      // Create the post with the image
      const postResponse = await fetch(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: this.personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text,
                },
                shareMediaCategory: 'IMAGE',
                media: [
                  {
                    status: 'READY',
                    description: {
                      text,
                    },
                    media: assetUrn,
                    title: {
                      text: 'LinkedIn Post Image',
                    },
                  },
                ],
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        }
      );

      const postData = await postResponse.json();

      if (postData.error) {
        throw new Error(postData.error_description);
      }

      return { id: postData.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Post to LinkedIn (Article/Link)
  async postArticle(text: string, title: string, url: string, thumbnailUrl?: string): Promise<LinkedInPostResponse> {
    if (!this.personUrn) {
      return { id: '', success: false, error: 'Person URN is required' };
    }

    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: this.personUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text,
                },
                shareMediaCategory: 'ARTICLE',
                media: [
                  {
                    status: 'READY',
                    originalUrl: url,
                    title: {
                      text: title,
                    },
                    ...(thumbnailUrl && {
                      thumbnail: thumbnailUrl,
                    }),
                  },
                ],
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      return { id: data.id, success: true };
    } catch (error: any) {
      return { id: '', success: false, error: error.message };
    }
  }

  // Get Profile Statistics
  async getProfileStatistics(): Promise<LinkedInProfileStats> {
    if (!this.personUrn) {
      throw new Error('Person URN is required');
    }

    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/networkAcounts?q=owner&owner=${this.personUrn}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      if (data.elements && data.elements.length > 0) {
        return {
          numConnections: data.elements[0].numConnections || 0,
          profileViews: data.elements[0].profileViews || 0,
          searchAppearances: data.elements[0].searchAppearances || 0,
        };
      }

      return {
        numConnections: 0,
        profileViews: 0,
        searchAppearances: 0,
      };
    } catch (error: any) {
      console.error('Failed to fetch profile statistics:', error);
      throw error;
    }
  }

  // Get LinkedIn Posts
  async getPosts(limit: number = 10): Promise<any[]> {
    if (!this.personUrn) {
      throw new Error('Person URN is required');
    }

    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=author&author=${this.personUrn}&count=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      return data.elements || [];
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      throw error;
    }
  }

  // Delete Post
  async deletePost(postUrn: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts/${postUrn}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      return response.status === 204;
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  }

  // Get Post Statistics
  async getPostStats(postUrn: string): Promise<any> {
    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/socialActions?q=target&target=${postUrn}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description);
      }

      return data.elements || [];
    } catch (error: any) {
      console.error('Failed to fetch post stats:', error);
      throw error;
    }
  }
}

export default LinkedInAPI;
