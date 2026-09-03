export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
