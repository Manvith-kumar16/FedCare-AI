# Lottie Files Directory

You can upload your downloaded `.json` Lottie files into this directory. 

Because this folder is inside the `public` directory, any file you place here will be accessible directly via URL in your React components.

## How to use a local Lottie file:

1. Place your file here, for example: `my-loader.json`
2. In your React component (like `Loader.jsx`), point the `src` attribute of the Player to `/lottie/my-loader.json`.

**Example:**
```jsx
<Player
    autoplay
    loop
    src="/lottie/my-loader.json"
    style={{ height: '120px', width: '120px' }}
/>
```
