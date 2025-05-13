/*
  # Add sample data to boost_taxo table

  1. Changes
    - Insert initial sample data into boost_taxo table
    - Data includes various audience segments with realistic values
*/

INSERT INTO public.boost_taxo (
  segment_name,
  data_supplier,
  estimated_volumes,
  boost_cpm,
  segment_description
) VALUES
  (
    'Health & Fitness Enthusiasts',
    'Lifestyle/Health & Fitness',
    25000000,
    5.75,
    'People actively engaged in fitness activities, gym memberships, and health-focused lifestyle choices'
  ),
  (
    'Business Decision Makers',
    'B2B/Decision Makers',
    8000000,
    12.50,
    'Senior professionals with purchasing authority in organizations'
  ),
  (
    'New Parents',
    'Life Stage/Parents',
    12000000,
    8.25,
    'Adults with children under 2 years old, actively purchasing baby products and services'
  ),
  (
    'Luxury Shoppers',
    'Shopping/Luxury',
    5000000,
    15.00,
    'High-income individuals who regularly purchase luxury items and premium brands'
  ),
  (
    'Tech Early Adopters',
    'Technology/Early Adopters',
    10000000,
    9.50,
    'Technology enthusiasts who purchase new gadgets and innovations early in the product lifecycle'
  ),
  (
    'Home Improvement DIY',
    'Lifestyle/Home & Garden',
    20000000,
    6.25,
    'Homeowners actively engaged in renovation and DIY home improvement projects'
  ),
  (
    'Travel Enthusiasts',
    'Lifestyle/Travel',
    30000000,
    7.50,
    'Frequent travelers booking flights, hotels, and planning regular vacations'
  ),
  (
    'Eco-Conscious Consumers',
    'Shopping/Sustainable',
    15000000,
    8.75,
    'Environmentally conscious shoppers prioritizing sustainable and eco-friendly products'
  ),
  (
    'Gaming Enthusiasts',
    'Entertainment/Gaming',
    40000000,
    5.25,
    'Active gamers across multiple platforms including console, PC, and mobile'
  ),
  (
    'Financial Decision Makers',
    'Finance/Investors',
    7000000,
    14.50,
    'Individuals actively managing investments and making significant financial decisions'
  );