// User authentication functionality
const AUTH_TOKEN_KEY = 'dream_auth_token';
const USER_DATA_KEY = 'dream_user_data';
const AUTH_CACHE_KEY = 'dream_auth_cache';
const AUTH_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Initialize authentication state
document.addEventListener('DOMContentLoaded', function() {
    initAuthState();
    cleanupExpiredCache();
    checkGoogleLoginCallback();
});

// Check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

// Get current user data
function getCurrentUser() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
}

// Initialize authentication state
function initAuthState() {
    const headerElement = document.querySelector('.header');
    
    if (!headerElement) {
        // Not on a page with header
        return;
    }
    
    if (isLoggedIn()) {
        // User is logged in
        const user = getCurrentUser();
        
        // Add user account section to header
        let avatarHTML = '';
        
        if (user.picture) {
            // User has a profile picture (from Google)
            avatarHTML = `<img src="${user.picture}" alt="${user.username}" class="user-avatar-img">`;
        } else {
            // Use first letter of username as avatar
            avatarHTML = `<div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>`;
        }
        
        const userAccountHTML = `
            <div class="user-account" id="userAccount">
                ${avatarHTML}
                <span>${user.username}</span>
                <i class="fas fa-chevron-down"></i>
                <div class="user-menu" id="userMenu">
                    <a href="#" class="user-menu-item">
                        <i class="fas fa-user"></i>
                        My Profile
                    </a>
                    <a href="#" class="user-menu-item">
                        <i class="fas fa-history"></i>
                        Dream History
                    </a>
                    <a href="#" class="user-menu-item">
                        <i class="fas fa-cog"></i>
                        Settings
                    </a>
                    <div class="user-menu-divider"></div>
                    <a href="#" class="user-menu-item" id="logoutButton">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </a>
                </div>
            </div>
        `;
        
        // Add user account to header
        headerElement.innerHTML += userAccountHTML;
        
        // Add event listeners
        document.getElementById('userAccount').addEventListener('click', function(e) {
            document.getElementById('userMenu').classList.toggle('active');
            e.stopPropagation();
        });
        
        document.getElementById('logoutButton').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            document.getElementById('userMenu')?.classList.remove('active');
        });
    } else {
        // User is not logged in
        const authButtonsHTML = `
            <div class="header-buttons">
                <a href="login.html" class="header-button login-button">Login</a>
                <a href="register.html" class="header-button register-button">Sign Up</a>
            </div>
        `;
        
        // Add auth buttons to header
        headerElement.innerHTML += authButtonsHTML;
    }
}

// Register a new user
async function register(username, email, password) {
    try {
        // In a real application, this would be an API call to your backend
        // For this demo, we'll simulate a successful registration
        
        // Simulate API request delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a fake token and user data
        const token = generateFakeToken();
        const userData = {
            id: generateFakeId(),
            username,
            email,
            created_at: new Date().toISOString()
        };
        
        // Store token and user data in localStorage
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        
        // Cache the authentication data with timestamp
        cacheAuthData(token, userData);
        
        // Show success message
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = 'Registration successful! Redirecting to login...';
        errorElement.className = 'success-message';
        errorElement.style.display = 'block';
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        showError('Registration failed: ' + error.message);
    }
}

// Login user
async function login(email, password, rememberMe) {
    try {
        // Check for cached credentials first
        if (tryCachedLogin(email, password)) {
            console.log('Logged in using cached credentials');
            return;
        }
        
        // In a real application, this would be an API call to your backend
        // For this demo, we'll simulate a successful login
        
        // Simulate API request delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a fake token and user data
        const token = generateFakeToken();
        const userData = {
            id: generateFakeId(),
            username: email.split('@')[0], // Use part of email as username for demo
            email,
            created_at: new Date().toISOString()
        };
        
        // Store token and user data in localStorage
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        
        // If remember me is checked, cache the auth data
        if (rememberMe) {
            cacheAuthData(token, userData, { email, password });
        }
        
        // Show success message
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = 'Login successful! Redirecting...';
        errorElement.className = 'success-message';
        errorElement.style.display = 'block';
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        showError('Login failed: ' + error.message);
    }
}

// Try to login using cached credentials
function tryCachedLogin(email, password) {
    const cachedAuth = getCachedAuth();
    if (!cachedAuth) return false;
    
    const matchingCache = cachedAuth.find(item => 
        item.credentials && 
        item.credentials.email === email && 
        item.credentials.password === password
    );
    
    if (matchingCache) {
        // Store token and user data in localStorage
        localStorage.setItem(AUTH_TOKEN_KEY, matchingCache.token);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(matchingCache.userData));
        
        // Show success message
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = 'Login successful! Redirecting...';
            errorElement.className = 'success-message';
            errorElement.style.display = 'block';
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            window.location.href = 'index.html';
        }
        
        return true;
    }
    
    return false;
}

// Cache authentication data
function cacheAuthData(token, userData, credentials = null) {
    let cachedAuth = getCachedAuth() || [];
    
    // Add new auth data
    cachedAuth.push({
        token,
        userData,
        credentials,
        timestamp: new Date().getTime()
    });
    
    // Limit cache size to 5 entries
    if (cachedAuth.length > 5) {
        cachedAuth = cachedAuth.slice(cachedAuth.length - 5);
    }
    
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cachedAuth));
}

// Get cached authentication data
function getCachedAuth() {
    const cachedData = localStorage.getItem(AUTH_CACHE_KEY);
    return cachedData ? JSON.parse(cachedData) : null;
}

// Clean up expired cache entries
function cleanupExpiredCache() {
    const cachedAuth = getCachedAuth();
    if (!cachedAuth) return;
    
    const currentTime = new Date().getTime();
    const validCache = cachedAuth.filter(item => 
        currentTime - item.timestamp < AUTH_CACHE_EXPIRY
    );
    
    if (validCache.length !== cachedAuth.length) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(validCache));
    }
}

// Logout user
function logout() {
    // Clear authentication data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem('google_id');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('picture');
    
    // Redirect to home page
    window.location.href = 'index.html';
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.className = 'error-message';
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
    }
}

// Helper functions
function generateFakeToken() {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

function generateFakeId() {
    return Math.floor(Math.random() * 10000).toString();
}

// Get root domain (for Google login)
function getRootDomain() {
    const hostName = window.location.hostname;
    const parts = hostName.split('.');
    
    // Check if it's an IP address
    if (/^(\d+\.){3}\d+$/.test(hostName)) {
        return hostName;
    }
    
    // If localhost or single part domain
    if (parts.length <= 1) {
        return hostName;
    }
    
    // Extract the root domain (last two parts)
    if (parts.length === 2) {
        return hostName;
    }
    
    return parts.slice(-2).join('.');
}

// Handle Google login
function handleGoogleLogin() {
    // 网站的固定域名
    const siteDomain = 'qhdrenxi.com';
    
    // 构建回调URL（确保回到首页）
    const callback = encodeURIComponent(`https://${siteDomain}/index.html`);
    
    // 检查是否是本地环境
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('192.168.');
    
    // 对于本地开发环境，使用特殊处理
    if (isLocalhost) {
        window.location.href = `https://aa.jstang.cn/google_login.php?url=localhost&redirect_uri=${callback}`;
        return;
    }
    
    // 生产环境：使用固定域名
    window.location.href = `https://aa.jstang.cn/google_login.php?url=${siteDomain}&redirect_uri=${callback}`;
}

// Check for Google login callback parameters
function checkGoogleLoginCallback() {
    // 首先检查URL中是否包含完整的Google登录参数
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('google_id')) {
        // 提取Google用户信息
        const googleId = urlParams.get('google_id');
        const name = urlParams.get('name');
        const email = urlParams.get('email');
        const picture = urlParams.get('picture');
        
        console.log("Google登录回调成功，获取到用户信息:", { googleId, name, email });
        
        // 存储到localStorage
        if (googleId) localStorage.setItem('google_id', googleId);
        if (name) localStorage.setItem('name', name);
        if (email) localStorage.setItem('email', email);
        if (picture) localStorage.setItem('picture', picture);
        
        // 生成token并创建用户数据
        const token = btoa(JSON.stringify({ googleId, name, email, picture }));
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        
        // 创建用户数据对象
        const userData = {
            id: googleId,
            username: name || (email ? email.split('@')[0] : 'User'),
            email: email || '',
            picture: picture || '',
            created_at: new Date().toISOString(),
            google_login: true
        };
        
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        
        // 清理URL - 直接跳转到首页而不是处理当前URL
        window.location.href = 'index.html';
    }
}

// Social login functionality
document.addEventListener('DOMContentLoaded', function() {
    // Google login button
    const googleButtons = document.querySelectorAll('.social-button.google');
    if (googleButtons) {
        googleButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                handleGoogleLogin();
            });
        });
    }
}); 