// Adds a Cloudinary delivery transformation (e.g. 'w_900,c_limit') to a Cloudinary URL.
// Any other URL is returned unchanged.
export const cld = (url, t) => (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/') ? url.replace('/upload/', `/upload/${t}/`) : url);
