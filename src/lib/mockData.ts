import { AudienceSegment } from '../types';

export const mockAudiences: AudienceSegment[] = [
  {
    id: "tech-enthusiasts",
    name: "Tech Enthusiasts",
    description: "Early adopters and tech-savvy consumers interested in latest gadgets and innovations",
    category: "Technology",
    subcategory: "Early Adopters",
    tags: ["technology", "gadgets", "innovation", "early-adopters"],
    reach: 25000000,
    cpm: 12.50
  },
  {
    id: "fitness-fanatics",
    name: "Fitness Fanatics",
    description: "Health-conscious individuals actively engaged in fitness activities and wellness",
    category: "Health",
    subcategory: "Fitness",
    tags: ["fitness", "health", "wellness", "exercise"],
    reach: 18000000,
    cpm: 9.75
  },
  {
    id: "luxury-shoppers",
    name: "Luxury Shoppers",
    description: "High-income consumers interested in premium and luxury products",
    category: "Shopping",
    subcategory: "Luxury",
    tags: ["luxury", "premium", "shopping", "high-end"],
    reach: 5000000,
    cpm: 15.00
  }
];