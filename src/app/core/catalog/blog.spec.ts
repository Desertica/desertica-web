import { BLOG_HERO_IMAGE, BLOG_PATH, blogPostPath, createBlogIndexStub } from './blog';

describe('blog catalog', () => {
  it('returns an empty stub ready for Strapi', () => {
    const index = createBlogIndexStub();

    expect(index.posts).toEqual([]);
    expect(index.hero.url).toBe(BLOG_HERO_IMAGE);
    expect(BLOG_PATH).toBe('/blog');
    expect(blogPostPath('dunas')).toBe('/blog/dunas');
  });
});
