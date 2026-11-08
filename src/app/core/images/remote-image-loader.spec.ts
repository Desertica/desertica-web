import { optimizedImageLoader } from './remote-image-loader';

describe('optimizedImageLoader', () => {
  const load = optimizedImageLoader(['cms.example.com']);

  it('routes images from known hosts through the resizer with the requested width', () => {
    expect(load({ src: 'https://cms.example.com/uploads/a.jpg', width: 640 })).toBe(
      `/_img?w=640&u=${encodeURIComponent('https://cms.example.com/uploads/a.jpg')}`,
    );
    expect(load({ src: 'https://cms.example.com/uploads/a.jpg' })).toContain('w=2400');
  });

  it('leaves other hosts, vectors, animations and relative paths alone', () => {
    expect(load({ src: 'https://other.example.com/a.jpg', width: 640 })).toBe(
      'https://other.example.com/a.jpg',
    );
    expect(load({ src: 'https://cms.example.com/uploads/logo.svg', width: 640 })).toBe(
      'https://cms.example.com/uploads/logo.svg',
    );
    expect(load({ src: 'https://cms.example.com/uploads/a.gif', width: 640 })).toBe(
      'https://cms.example.com/uploads/a.gif',
    );
    expect(load({ src: '/brand/mark.svg', width: 64 })).toBe('/brand/mark.svg');
  });
});
