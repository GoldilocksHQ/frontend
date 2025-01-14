import {NextRequest, NextResponse} from "next/server";
import {authServices, SignUpData, SignInData} from "../../../services/authServices";

// POST /api/auth (e.g., for signup or login, depending on your request body)
export async function POST(req: NextRequest) {
  try {
    const { action, email, password } = await req.json();
    
    if( !email ){
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    } else if( !password ) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    switch (action) {
      case 'signup':
        const signupResponse = await handleSignup(email, password);
        return NextResponse.json(signupResponse, { status: 200 });
      case 'signin':
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
