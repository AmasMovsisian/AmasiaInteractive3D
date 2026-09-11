/**
 * Payload for user registration.
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
}

/**
 * Payload for user login.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Response returned after a successful login.
 */
export interface LoginResponse {
  access: string;
  refresh: string;
}

/**
 * Authenticated user data.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  profile_image: string | null;
}

/**
 * Payload for changing the user's password.
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password2: string;
}
