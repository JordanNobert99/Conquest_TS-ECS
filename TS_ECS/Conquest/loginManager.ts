import { AuthService } from './firebase.js';
export class LoginManager {
    private authService: AuthService;
    private loginContainer: HTMLElement | null = null;
    private onLoginSuccess: () => void;

    constructor(onLoginSuccess: () => void) {
        this.authService = new AuthService();
        this.onLoginSuccess = onLoginSuccess;
        this.createLoginUI();
    }

    private createLoginUI(): void {
        // Create login container
        this.loginContainer = document.createElement('div');
        this.loginContainer.className = 'login-container';
        this.loginContainer.innerHTML = `
            <div class="login-box">
                <h1>Conquest</h1>
                <form id="login-form" class="login-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required autocomplete="current-password">
                    </div>
                    <div id="error-message" class="error-message hidden"></div>
                    <div class="login-buttons">
                        <button type="submit" class="btn btn-primary">Login</button>
                        <button type="button" id="register-btn" class="btn btn-secondary">Register</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.loginContainer);

        // Add event listeners
        const form = document.getElementById('login-form') as HTMLFormElement;
        const registerBtn = document.getElementById('register-btn') as HTMLButtonElement;

        form.addEventListener('submit', (e) => this.handleLogin(e));
        registerBtn.addEventListener('click', () => this.handleRegister());
    }

    private async handleLogin(event: Event): Promise<void> {
        event.preventDefault();

        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const errorMsg = document.getElementById('error-message') as HTMLElement;

        try {
            errorMsg.classList.add('hidden');
            const user = await this.authService.login(email, password);

            console.log('Login successful:', user.email);

            // Check if admin
            if (this.authService.checkIsAdmin()) {
                console.log('Welcome Admin!');
                this.showAdminBadge();
            }

            // Hide login screen and start game
            setTimeout(() => {
                this.hideLogin();
                this.onLoginSuccess();
            }, 1000);

        } catch (error: any) {
            errorMsg.textContent = this.getErrorMessage(error.code);
            errorMsg.classList.remove('hidden');
        }
    }

    private async handleRegister(): Promise<void> {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const errorMsg = document.getElementById('error-message') as HTMLElement;

        if (!email || !password) {
            errorMsg.textContent = 'Please enter email and password';
            errorMsg.classList.remove('hidden');
            return;
        }

        try {
            errorMsg.classList.add('hidden');
            const user = await this.authService.register(email, password);

            console.log('Registration successful:', user.email);
            errorMsg.textContent = 'Registration successful! Logging in...';
            errorMsg.style.background = '#44ff44';
            errorMsg.classList.remove('hidden');

            setTimeout(() => {
                this.hideLogin();
                this.onLoginSuccess();
            }, 1500);

        } catch (error: any) {
            errorMsg.textContent = this.getErrorMessage(error.code);
            errorMsg.classList.remove('hidden');
        }
    }

    private getErrorMessage(errorCode: string): string {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-disabled':
                return 'This account has been disabled';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'Email already registered';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters';
            default:
                return 'Authentication error. Please try again.';
        }
    }

    private showAdminBadge(): void {
        const title = this.loginContainer?.querySelector('h1');
        if (title) {
            title.innerHTML = 'Conquest<span class="admin-badge">ADMIN</span>';
        }
    }

    private hideLogin(): void {
        if (this.loginContainer) {
            this.loginContainer.classList.add('hidden');
        }
    }

    public isAdmin(): boolean {
        return this.authService.checkIsAdmin();
    }

    public getCurrentUser() {
        return this.authService.getCurrentUser();
    }
}