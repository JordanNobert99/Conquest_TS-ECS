import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import {
    getFirestore,
    Firestore,
    doc,
    getDoc,
    setDoc
} from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDMzKrZe36Fs-quigiznPtSvFPIJBeo3ns",
    authDomain: "nobertstudios-435b1.firebaseapp.com",
    projectId: "nobertstudios-435b1",
    storageBucket: "nobertstudios-435b1.firebasestorage.app",
    messagingSenderId: "456688315722",
    appId: "1:456688315722:web:5ef8435ce71d5f20e2e5b3"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Check if user is admin
export async function isAdmin(userId: string): Promise<boolean> {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        return userDoc.exists() && userDoc.data()?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Set user role (call this once to make your account admin)
export async function setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    try {
        await setDoc(doc(db, 'users', userId), { role }, { merge: true });
        console.log(`✅ User role set to: ${role}`);
    } catch (error) {
        console.error('Error setting user role:', error);
        throw error;
    }
}

// Auth service wrapper
export class AuthService {
    private currentUser: User | null = null;
    private isUserAdmin: boolean = false;

    constructor() {
        onAuthStateChanged(auth, async (user: User | null) => {
            this.currentUser = user;
            if (user) {
                this.isUserAdmin = await isAdmin(user.uid);
            } else {
                this.isUserAdmin = false;
            }
        });
    }

    async login(email: string, password: string): Promise<User> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        this.isUserAdmin = await isAdmin(result.user.uid);
        return result.user;
    }

    async register(email: string, password: string): Promise<User> {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Set default role as 'user'
        await setUserRole(result.user.uid, 'user');
        return result.user;
    }

    async logout(): Promise<void> {
        await signOut(auth);
        this.currentUser = null;
        this.isUserAdmin = false;
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    checkIsAdmin(): boolean {
        return this.isUserAdmin;
    }
}