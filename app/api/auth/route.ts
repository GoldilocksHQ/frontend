import {NextRequest, NextResponse} from "next/server";
import {authServices, SignUpData, SignInData} from "../../../services/authServices";

// POST /api/auth (e.g., for signup or login, depending on your request body)
export async function POST(req: NextRequest) {
  try {
    const { action, email, password } = await req.json();
    const result = checkAccountCredentials(email, password);
    
    switch (action) {
      case 'signup':
        if (result) return result;
        const signupResponse = await handleSignup(email, password);
        return NextResponse.json(signupResponse, { status: 200 });
      case 'signin':
        if (result) return result;
        const signinResponse = await handleSignin(email, password);
        return NextResponse.json(signinResponse, { status: 200 });
      case 'signout':
        const signoutResponse = await handleSignout();
        return NextResponse.json(signoutResponse, { status: 200 });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function checkAccountCredentials(email: string, password: string){
  if( !email ){
    return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
  } else if( !password ) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }
  return null;
}


// Handle user registration
function handleSignup(email: string, password: string){
  const credentials: SignUpData = { email, password };
  return authServices.signUp(credentials);
}

// Handle user login
function handleSignin(email: string, password: string){
  const credentials: SignInData = { email, password };
  return authServices.signIn(credentials);
}

// Handle user logout
function handleSignout(){
  return authServices.signOut();
}
