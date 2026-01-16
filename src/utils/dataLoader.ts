import { Project } from '../types';
import { supabase } from '../lib/supabase';

export const loadProjects = async (): Promise<Project[]> => {
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('date', { ascending: false });

  if (projectsError) {
    console.error('Error loading projects:', projectsError);
    return [];
  }

  if (!projectsData) return [];

  const projectsWithVideos = await Promise.all(
    projectsData.map(async (project) => {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('project_id', project.id)
        .order('order_index', { ascending: true });

      if (videosError) {
        console.error('Error loading videos for project:', videosError);
        return null;
      }

      return {
        id: project.id,
        title: project.title,
        type: project.type,
        client_type: project.client_type,
        client_name: project.client_name,
        client_logo: project.client_logo,
        date: project.date,
        reach: {
          views: project.reach_views,
          channels: project.reach_channels,
          impressions: project.reach_impressions,
        },
        poster: project.poster,
        videos: videosData.map((video) => ({
          title: video.title,
          platform: video.platform as 'youtube' | 'vimeo' | 'mega' | 'instagram',
          link: video.link,
        })),
        description: project.description,
        testimonial: {
          client: project.testimonial_client,
          text: project.testimonial_text,
          role: project.testimonial_role || undefined,
        },
      } as Project;
    })
  );

  return projectsWithVideos.filter((p): p is Project => p !== null);
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
  return `/portfolio/${slugify(project.client_name)}/${slugify(project.title)}`;
};

// Mock data for seeding - keeping for reference
/* prettier-ignore */
const mockProjects: Project[] = [
  /* ——— MUSIC: TROOPER ——— */
  {
    title: "Trooper – Dual Release",
    type: "Music Video",
    client_type: "Company",
    client_name: "Trooper Band",
    client_logo: "/logos/trooper.svg",
    date: "2024-11-14",
    reach: {
      views: 920_000,
      channels: ["YouTube", "Facebook", "Instagram"]
    },
    poster: "https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Când ești doar un simplu om",
        platform: "youtube",
        link: "https://www.youtube.com/embed/Ic7UQBXr1p4"
      },
      {
        title: "Vlad Țepeș",
        platform: "youtube",
        link: "https://www.youtube.com/embed/hDjg8qUyN7A"
      }
    ],
    description: "A two-part visual narrative blending modern metal aesthetics with Romanian medieval iconography to amplify the band’s socially charged lyrics.",
    testimonial: {
      client: "Alin Dincă (Lead Vocalist)",
      text: "They translated our raw energy into an epic visual journey."
    }
  },

  /* ——— MUSIC: DESTIN ——— */
  {
    title: "Destin – Trilogy",
    type: "Music Video",
    client_type: "Company",
    client_name: "Destin Band",
    client_logo: "/logos/destin.svg",
    date: "2024-08-07",
    reach: {
      views: 480_000,
      channels: ["YouTube", "Instagram"]
    },
    poster: "https://images.pexels.com/photos/1679670/pexels-photo-1679670.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "TMDF",
        platform: "youtube",
        link: "https://www.youtube.com/embed/H-W5kA0NGNw"
      },
      {
        title: "Felinar",
        platform: "youtube",
        link: "https://www.youtube.com/embed/9M1zAUYeoG4"
      }
    ],
    description: "A moody, performance-driven package that alternates neon-lit interiors with twilight exteriors to reflect the band’s urban-folk fusion.",
    testimonial: {
      client: "Destin Management",
      text: "Exceptional visual storytelling that elevated our release cycle."
    }
  },

  /* ——— PRESENTATION: LESSONPLAZA ——— */
  {
    title: "LessonPlaza – Seed-Stage Pitch",
    type: "Presentation",
    client_type: "Company",
    client_name: "LessonPlaza",
    client_logo: "/logos/lessonplaza.svg",
    date: "2025-02-10",
    reach: {
      views: 140_000,
      channels: ["YouTube", "LinkedIn"]
    },
    poster: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Investor Presentation",
        platform: "youtube",
        link: "https://www.youtube.com/embed/shcXLeIJAPA"
      }
    ],
    description: "Concise 2-minute explainer illustrating the platform’s adaptive-learning engine with motion-graphic overlays and real user testimonials.",
    testimonial: {
      client: "Irina Popescu (CEO)",
      text: "The video became the centrepiece of our successful seed round."
    }
  },

  /* ——— PRESENTATION: PUREPEARL INNOVO ——— */
  {
    title: "Purepearl Innovo – Biotech Reveal",
    type: "Presentation",
    client_type: "Company",
    client_name: "Purepearl Innovo",
    client_logo: "/logos/purepearl.svg",
    date: "2024-12-05",
    reach: {
      views: 230_000,
      channels: ["YouTube", "Industry Webinars"]
    },
    poster: "https://images.pexels.com/photos/256262/pexels-photo-256262.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Corporate Launch Clip",
        platform: "youtube",
        link: "https://www.youtube.com/embed/JJc7irC9zes"
      }
    ],
    description: "High-impact launch piece visualising next-gen pearl-derived biomaterials with fluid 3-D renders and kinetic type.",
    testimonial: {
      client: "Dr. Andrei Radu",
      text: "They crystallised complex science into a captivating narrative."
    }
  },

  /* ——— EVENT: ROMATSA CUP ——— */
  {
    title: "ROMATSA – Air-Traffic Controllers’ Cup",
    type: "Event Highlights",
    client_type: "Company",
    client_name: "ROMATSA",
    client_logo: "/logos/romatsa.svg",
    date: "2024-09-19",
    reach: {
      views: 75_000,
      channels: ["YouTube"]
    },
    poster: "https://images.pexels.com/photos/461593/pexels-photo-461593.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Event Recap",
        platform: "youtube",
        link: "https://www.youtube.com/embed/geon-jbnZqQ"
      }
    ],
    description: "Dynamic 90-second wrap-up weaving drone-shot athletics with control-tower cutaways to celebrate ROMATSA’s culture of precision and teamwork.",
    testimonial: {
      client: "George Ionescu",
      text: "A stellar recap that boosted internal morale and external visibility."
    }
  },

  /* ——— ADVERTISEMENT: VOCEA SEMNELOR ——— */
  {
    title: "Vocea Semnelor – Awareness Billboard",
    type: "Advertisement",
    client_type: "Company",
    client_name: "Vocea Semnelor Campaign",
    client_logo: "/logos/vocea.svg",
    date: "2025-01-11",
    reach: {
      views: 610_000,
      channels: ["YouTube", "TV", "Digital OOH"]
    },
    poster: "https://images.pexels.com/photos/457586/pexels-photo-457586.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Billboard Spot",
        platform: "youtube",
        link: "https://www.youtube.com/embed/b1Aberb4Gzo"
      }
    ],
    description: "30-second spot translating sign-language into bold typographic animations, projected on city billboards to champion inclusivity.",
    testimonial: {
      client: "Campaign Board",
      text: "Their creativity helped us reach audiences we never imagined."
    }
  },

  /* ——— VLOG: CODIN MATICIUC ——— */
  {
    title: "Codin Maticiuc – Dubai Real-Estate Vlog",
    type: "Vlog",
    client_type: "Individual",
    client_name: "Codin Maticiuc",
    client_logo: "/logos/codin.svg",
    date: "2024-10-27",
    reach: {
      views: 315_000,
      channels: ["YouTube", "Facebook"]
    },
    poster: "https://images.pexels.com/photos/1696771/pexels-photo-1696771.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Investing in Dubai",
        platform: "youtube",
        link: "https://www.youtube.com/embed/Zb633-ZGmEo"
      }
    ],
    description: "12-minute lifestyle vlog combining tongue-in-cheek humour with high-rise aerials to unpack Dubai’s booming property market.",
    testimonial: {
      client: "Codin Maticiuc",
      text: "Exactly the vibe my YouTube community loves."
    }
  },

  /* ——— TRAILER: INTERNATIONAL BOOK TRAILER FESTIVAL ——— */
  {
    title: "International Book Trailer Festival",
    type: "Trailer",
    client_type: "Company",
    client_name: "IBTF",
    client_logo: "/logos/ibtf.svg",
    date: "2024-07-05",
    reach: {
      views: 95_000,
      channels: ["YouTube", "Festival Site"]
    },
    poster: "https://images.pexels.com/photos/261909/pexels-photo-261909.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Festival Teaser",
        platform: "youtube",
        link: "https://www.youtube.com/embed/XLG_WLaoB-I"
      }
    ],
    description: "A kinetic-typography teaser interlacing author sound-bites with fast-cut imagery of landmark literary venues across Europe.",
    testimonial: {
      client: "Festival Board",
      text: "The trailer captured the festival’s soul in under a minute."
    }
  },

  /* ——— TRAILER: BOOVIE FESTIVAL ——— */
  {
    title: "Boovie Festival – Award-Winning Trailer",
    type: "Trailer",
    client_type: "Company",
    client_name: "Boovie Festival",
    client_logo: "/logos/boovie.svg",
    date: "2024-06-12",
    reach: {
      views: 180_000,
      channels: ["YouTube", "TikTok"]
    },
    poster: "https://images.pexels.com/photos/733852/pexels-photo-733852.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Grand Prize Trailer",
        platform: "youtube",
        link: "https://www.youtube.com/embed/ZLpD2NN59-U"
      }
    ],
    description: "Award-winning micro-drama weaving cosplay, stop-motion, and festival B-roll to spark interest among Gen-Z readers.",
    testimonial: {
      client: "Festival Jury",
      text: "An electrifying piece that set a new benchmark for us."
    }
  },

  /* ——— ERASMUS+ PROJECT (COMMUNICATION) ——— */
  {
    title: "Erasmus+ – Overcoming Communication Barriers",
    type: "Documentary Short",
    client_type: "Company",
    client_name: "Erasmus+ Programme",
    client_logo: "/logos/erasmus.svg",
    date: "2025-03-18",
    reach: {
      views: 66_000,
      channels: ["YouTube", "Project Portals"]
    },
    poster: "https://images.pexels.com/photos/1462633/pexels-photo-1462633.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Project Documentary",
        platform: "youtube",
        link: "https://www.youtube.com/embed/7llaXsq-AtA"
      }
    ],
    description: "A people-centric film following five students across borders as they break language barriers through immersive workshops.",
    testimonial: {
      client: "Project Coordinator",
      text: "Beautifully captures the human side of European collaboration."
    }
  },

  /* ——— ERASMUS+ PROJECT (FOOD-Y) ——— */
  {
    title: "Erasmus+ FOOD-Y – Responsible Purchasing",
    type: "Competition Entry",
    client_type: "Company",
    client_name: "Erasmus+ Programme",
    client_logo: "/logos/erasmus.svg",
    date: "2024-05-02",
    reach: {
      views: 52_000,
      channels: ["YouTube", "School Networks"]
    },
    poster: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Competition Spot (3rd Place)",
        platform: "youtube",
        link: "https://www.youtube.com/embed/vLd7TeG3eWA"
      }
    ],
    description: "A playful, infographic-style clip encouraging teens to track the carbon footprint of their cafeteria meals.",
    testimonial: {
      client: "Faculty Advisor",
      text: "Engaging, informative, and perfectly on message."
    }
  },

  /* ——— SOCIAL CAMPAIGN: YOUNINCUBATOR ——— */
  {
    title: "Younincubator – Gen-Z Startup Series",
    type: "Advertisement",
    client_type: "Company",
    client_name: "Younincubator",
    client_logo: "/logos/youn.svg",
    date: "2025-04-09",
    reach: {
      views: 310_000,
      channels: ["Instagram", "TikTok", "YouTube Shorts"]
    },
    poster: "https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Social Media Reel",
        platform: "instagram",
        link: "https://www.instagram.com/reel/DHLuu1lpd9k/"
      }
    ],
    description: "Fast-paced reel using split-screen motion to showcase five incubated startups in under 30 seconds.",
    testimonial: {
      client: "Program Director",
      text: "It boosted our applications by 40 % in a single week."
    }
  },

  /* ——— PRESENTATION: BBB 2025 ——— */
  {
    title: "BBB 2025 – Concept Reveal",
    type: "Presentation",
    client_type: "Company",
    client_name: "Big Bold Brand (BBB)",
    client_logo: "/logos/bbb.svg",
    date: "2025-05-27",
    reach: {
      views: 205_000,
      channels: ["Instagram", "LinkedIn"]
    },
    poster: "https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Launch Reel",
        platform: "instagram",
        link: "https://www.instagram.com/reel/DHjRep1IB2Y/"
      }
    ],
    description: "A motion-graphic driven brand deck boiled down to a snappy 25-second reel tailored for conference screens and social feeds.",
    testimonial: {
      client: "Marketing Lead",
      text: "Turned our abstract vision into a crowd-pleaser."
    }
  },

  /* ——— PODCAST SERIES ——— */
  {
    title: "EduTalks – Season 1 Podcast Series",
    type: "Podcast",
    client_type: "Company",
    client_name: "EduTalks",
    client_logo: "/logos/edutalks.svg",
    date: "2024-04-15",
    reach: {
      views: 120_000,
      channels: ["YouTube", "Spotify", "Apple Podcasts"]
    },
    poster: "https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=800",
    videos: [
      {
        title: "Vlad Zografi – Adolescența e momentul în care se face lumină.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/Wl4J7-aRV2M"
      },
      {
        title: "Doru Dumitrescu – Empatia profesorului stă la baza chimiei cu elevii",
        platform: "youtube",
        link: "https://www.youtube.com/embed/cg6_Hqc1_FM"
      },
      {
        title: "George Bucur – E bine să stai în școală, dar să și muncești în același timp.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/fpajiUCGU9U"
      },
      {
        title: "Daniel Nuță – Ca actor, cea mai mare greșeală este să joci pentru aplauze.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/02v7dvvDgws"
      },
      {
        title: "Matei Reu – Bacul este doar un checkpoint.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/MZ84vOZLX8g"
      },
      {
        title: "Filip-Lucian Iorga – Ceea ce nu îți face plăcere, nu este bun de nimic.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/gLPMHHjs3Uo"
      },
      {
        title: "Step Into Democracy – Scopul este să ajungem la cei dezinteresați.",
        platform: "youtube",
        link: "https://www.youtube.com/embed/K0TFe4RshWk"
      },
      {
        title: "Aurelian “Balaurul” Dincă – Nu e ok să depindă ce mănânci mâine de…",
        platform: "youtube",
        link: "https://www.youtube.com/embed/ICYKOI-7KKI"
      }
    ],
    description: "Eight in-depth conversations with thought-leaders and creatives, filmed in an intimate studio setup and optimised for cross-platform distribution.",
    testimonial: {
      client: "Podcast Producer",
      text: "Your technical polish made our guests truly shine."
    }
  }
];

export const seedProjects = async () => {
  console.log('Starting to seed projects...');

  for (const mockProject of mockProjects) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: mockProject.title,
        type: mockProject.type,
        client_type: mockProject.client_type,
        client_name: mockProject.client_name,
        client_logo: mockProject.client_logo,
        date: mockProject.date,
        reach_views: mockProject.reach.views,
        reach_channels: mockProject.reach.channels,
        reach_impressions: Math.floor(mockProject.reach.views * 1.5),
        poster: mockProject.poster,
        description: mockProject.description,
        testimonial_client: mockProject.testimonial.client,
        testimonial_text: mockProject.testimonial.text,
        testimonial_role: mockProject.testimonial.role || null,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error inserting project:', mockProject.title, projectError);
      continue;
    }

    if (project) {
      for (let i = 0; i < mockProject.videos.length; i++) {
        const video = mockProject.videos[i];
        const { error: videoError } = await supabase
          .from('videos')
          .insert({
            project_id: project.id,
            title: video.title,
            platform: video.platform,
            link: video.link,
            order_index: i,
          });

        if (videoError) {
          console.error('Error inserting video:', video.title, videoError);
        }
      }
      console.log('Seeded project:', mockProject.title);
    }
  }

  console.log('Seeding complete!');
};