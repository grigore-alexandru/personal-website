export interface Project {
  title: string;
  type: string;
  client_type: string;
  client_name: string;
  client_logo: string;
  date: string;
  reach: {
    views: number;
    channels: string[];
  };
  poster: string;
  videos: Video[];
  description: string;
  testimonial: {
    client: string;
    text: string;
    role?: string;
  };
}

export interface Video {
  title: string;
  platform: 'youtube' | 'vimeo' | 'mega';
  link: string;
}

export interface Filter {
  id: string;
  label: string;
  active: boolean;
}