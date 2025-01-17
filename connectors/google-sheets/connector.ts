// import { OAuth2Client, Credentials } from 'google-auth-library';
// import { google } from 'googleapis';
// import { TokenManager } from '@/lib/token-manager';

// export class GoogleSheetsConnector {
//   private tokenManager: TokenManager;
//   private readonly SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

//   constructor() {
//     this.tokenManager = new TokenManager();
//   }

//   isAuthorized(userId: string): boolean {
//     return this.tokenManager.getCredentials(userId) !== null;
//   }

//   getAuthorizationUrl(userId: string): string {
//     const oauth2Client = new OAuth2Client(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI
//     );

//     const state = encodeURIComponent(JSON.stringify({ userId }));
    
//     return oauth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: this.SCOPES,
//       prompt: 'consent',
//       state
//     });
//   }

//   async exchangeCodeForTokens(userId: string, code: string): Promise<void> {
//     const oauth2Client = new OAuth2Client(
//       process.env.GOOGLE_CLIENT_ID,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI
//     );

//     const { tokens } = await oauth2Client.getToken(code);
//     await this.tokenManager.storeCredentials(userId, tokens);
//   }

//   async getCredentials(userId: string): Promise<Credentials | null> {
//     return await this.tokenManager.getCredentials(userId);
//   }

//   async readValues(userId: string, spreadsheetId: string, range: string): Promise<any[][]> {
//     const creds = await this.getCredentials(userId);
//     if (!creds) {
//       throw new Error("No valid credentials. User must authorize first.");
//     }

//     const oauth2Client = new OAuth2Client();
//     oauth2Client.setCredentials(creds);

//     const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId,
//       range,
//     });

//     return response.data.values || [];
//   }

//   async updateValues(userId: string, spreadsheetId: string, range: string, data: any): Promise<any> {
//     const creds = await this.getCredentials(userId);
//     if (!creds) {
//       throw new Error("No valid credentials. User must authorize first.");
//     }

//     const oauth2Client = new OAuth2Client();
//     oauth2Client.setCredentials(creds);

//     const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
//     const response = await sheets.spreadsheets.values.update({
//       spreadsheetId,
//       range,
//       valueInputOption: 'RAW',
//       requestBody: { values: data }
//     });

//     return response.data;
//   }
// }


