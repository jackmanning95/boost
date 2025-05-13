/*
  # Add test data to boost_taxo table

  1. Changes
    - Insert sample audience segments into boost_taxo table
    - Data includes various categories and descriptions for testing search
*/

INSERT INTO public.boost_taxo (segment_name, data_supplier, estimated_volumes, boost_cpm, segment_description)
VALUES
  ('Health & Fitness Enthusiasts', 'Lifestyle/Health', 25000000, 5.75, 'People actively engaged in fitness activities, gym memberships, and health-focused lifestyle'),
  ('Business Decision Makers', 'B2B/Executive', 8000000, 12.50, 'Senior professionals with purchasing authority in organizations'),
  ('New Parents', 'Life Stage/Family', 12000000, 8.25, 'Adults with children under 2 years old, interested in baby products and parenting'),
  ('Luxury Shoppers', 'Retail/Luxury', 5000000, 15.00, 'High-income individuals who regularly purchase luxury brands and premium products'),
  ('Tech Early Adopters', 'Technology/Innovation', 10000000, 9.50, 'Technology enthusiasts who purchase new gadgets and devices early'),
  ('Outdoor Adventurers', 'Lifestyle/Recreation', 15000000, 6.75, 'Active individuals interested in hiking, camping, and outdoor activities');