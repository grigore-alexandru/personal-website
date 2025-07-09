import { Project } from '../types';

// Mock data for development - replace with actual JSON file loading
const mockProjects: Project[] = [
  {
    title: "Rising Tide",
    type: "Advertisement",
    client_type: "Company",
    client_name: "BlueWater Co",
    client_logo: "/logos/bluewater.svg",
    date: "2023-10-15",
    reach: {
      views: 550000,
      channels: ["TV", "YouTube", "Instagram"]
    },
    poster: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Main Campaign",
        platform: "youtube",
        link: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      },
      {
        title: "Behind the Scenes",
        platform: "vimeo",
        link: "https://player.vimeo.com/video/148751763"
      }
    ],
    description: "30-second spot promoting sustainable ocean practices with stunning underwater cinematography and powerful storytelling.",
    testimonial: {
      client: "Anna Smith",
      text: "They captured our brand vision perfectly and delivered beyond expectations.",
      role: "Marketing Director, BlueWater Co"
    }
  },
  {
    title: "Urban Dreams",
    type: "Documentary",
    client_type: "Individual",
    client_name: "Marcus Johnson",
    client_logo: "/logos/marcus.svg",
    date: "2023-08-22",
    reach: {
      views: 125000,
      channels: ["YouTube", "Vimeo"]
    },
    poster: "https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Full Documentary",
        platform: "vimeo",
        link: "https://player.vimeo.com/video/148751763"
      }
    ],
    description: "A 15-minute documentary exploring the intersection of architecture and community in modern urban spaces.",
    testimonial: {
      client: "Marcus Johnson",
      text: "Professional, creative, and deeply understanding of the subject matter.",
      role: "Documentary Subject"
    }
  },
  {
    title: "Tech Forward",
    type: "Commercial",
    client_type: "Company",
    client_name: "InnovateTech",
    client_logo: "/logos/innovate.svg",
    date: "2023-11-05",
    reach: {
      views: 890000,
      channels: ["TV", "YouTube", "Instagram", "LinkedIn"]
    },
    poster: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Main Commercial",
        platform: "youtube",
        link: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      }
    ],
    description: "High-energy commercial showcasing cutting-edge technology solutions for modern businesses.",
    testimonial: {
      client: "Sarah Chen",
      text: "Exceeded all expectations with their innovative approach and attention to detail.",
      role: "CEO, InnovateTech"
    }
  },
  {
    title: "Nature's Symphony",
    type: "Music Video",
    client_type: "Individual",
    client_name: "Elena Rodriguez",
    client_logo: "/logos/elena.svg",
    date: "2023-09-18",
    reach: {
      views: 245000,
      channels: ["YouTube", "Instagram"]
    },
    poster: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Nature's Symphony",
        platform: "youtube",
        link: "https://www.youtube.com/embed/dQw4w9WgXcQ"
      }
    ],
    description: "Ethereal music video combining natural landscapes with artistic performance.",
    testimonial: {
      client: "Elena Rodriguez",
      text: "They brought my vision to life with incredible artistry and technical skill.",
      role: "Recording Artist"
    }
  }
];

export const loadProjects = async (): Promise<Project[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockProjects;
};

export const loadProject = async (clientSlug: string, projectSlug: string): Promise<Project | null> => {
  const projects = await loadProjects();
  return projects.find(p => 
    slugify(p.client_name) === clientSlug && 
    slugify(p.title) === projectSlug
  ) || null;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateProjectUrl = (project: Project): string => {
  return `/what-i-do/video-production/${slugify(project.client_name)}/${slugify(project.title)}`;
};