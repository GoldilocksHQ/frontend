// import { OAuth2Client, Credentials } from 'google-auth-library';
// import { TokenManager, TokenData } from './token-manager';

// export class GoogleTokenManager extends TokenManager {
//   private oauth2Client: OAuth2Client;

//   constructor() {
//     super();
//     this.oauth2Client = new OAuth2Client(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI
//     );
//   }

//   async getGoogleCredentials(userId: string): Promise<Credentials | null> {
//     const tokens = await this.getCredentials(userId, "google_sheets");
//     if (!tokens) return null;

//     const credentials: Credentials = {
//       access_token: tokens.access_token,
//       refresh_token: tokens.refresh_token,
//       expiry_date: tokens.expires_at.getTime()
//     };

//     // Refresh if expired
//     if (this.isExpired(credentials)) {
//       try {
//         this.oauth2Client.setCredentials(credentials);
//         const { credentials: refreshedCreds } = await this.oauth2Client.refreshAccessToken();
//         await this.storeGoogleCredentials(userId, refreshedCreds);
//         return refreshedCreds;
//       } catch (error) {
//         console.error('Error refreshing token:', error);
//         return null;
//       }
//     }

//     return credentials;
//   }

//   async storeGoogleCredentials(userId: string, credentials: Credentials): Promise<void> {
//     const tokenData: TokenData = {
//       access_token: credentials.access_token!,
//       refresh_token: credentials.refresh_token!,
//       expires_at: new Date(credentials.expiry_date!),
//       integration: "google_sheets"
//     };

//     await this.storeCredentials(userId, tokenData);
//   }

//   private isExpired(credentials: Credentials): boolean {
//     return credentials.expiry_date ? Date.now() >= credentials.expiry_date : true;
//   }
// } 