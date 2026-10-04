import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface AuthResponse {
  token: string;
  role: string;
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  http = inject(HttpClient);
  router = inject(Router);

  user: AuthResponse | null = this.readUser();

  private readUser(): AuthResponse | null {
    try {
      return JSON.parse(localStorage.getItem('profa_user') || 'null');
    } catch {
      localStorage.removeItem('profa_user');
      return null;
    }
  }

  token() {
    return localStorage.getItem('profa_token');
  }

  login(data: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/api/v1/auth/login`, data)
      .pipe(tap(response => this.save(response)));
  }

  register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
  }) {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/api/v1/auth/register`, data)
      .pipe(tap(response => this.save(response)));
  }

  save(response: AuthResponse) {
    if (!response?.token || !response?.role) {
      throw new Error('Réponse d’authentification invalide.');
    }

    localStorage.setItem('profa_token', response.token);
    localStorage.setItem('profa_user', JSON.stringify(response));
    this.user = response;
  }

  logout() {
    localStorage.removeItem('profa_token');
    localStorage.removeItem('profa_user');
    this.user = null;
    this.router.navigateByUrl('/');
  }

  isLogged() {
    return !!this.token();
  }

  role() {
    return this.user?.role;
  }
}