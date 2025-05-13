import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ArrowRight, Database, Users, Layers, Target, Sparkles } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
  if (user) {
    return <Navigate to={isAdmin ? '/requests' : '/audiences'} replace />;
  }
  
  return (
    <Layout fullWidth>
      <section className="bg-[#509fe0] text-white">
        <div className="container mx-auto px-6 py-20 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                The intelligent audience platform for data-driven marketing
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Discover, select, and activate the perfect audience segments for your campaigns with AI-powered recommendations.
              </p>
              <Link to="/login">
                <Button 
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={20} />}
                >
                  Get Started
                </Button>
              </Link>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-6 text-gray-900">
                  <div className="flex items-center mb-4">
                    <Database className="h-6 w-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-bold">Audience Explorer</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-100 rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Health & Fitness Enthusiasts</h4>
                          <p className="text-sm text-gray-600">Health, Fitness, Wellness</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">25M</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded p-3 ring-2 ring-blue-500">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Tech Early Adopters</h4>
                          <p className="text-sm text-gray-600">Technology, Innovation</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">10M</span>
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">Luxury Shoppers</h4>
                          <p className="text-sm text-gray-600">Premium, High-end</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">5M</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 bg-teal-500 rounded-lg p-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Streamlined Audience Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform simplifies the process of discovering, selecting, and activating 
              audience segments across multiple platforms.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <Layers className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Comprehensive Taxonomy
              </h3>
              <p className="text-gray-600">
                Access a curated library of audience segments organized into an intuitive 
                taxonomy that makes discovery effortless.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                AI Recommendations
              </h3>
              <p className="text-gray-600">
                Let our AI suggest the perfect audience combinations based on your campaign 
                goals and previous selections.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Multi-Platform Activation
              </h3>
              <p className="text-gray-600">
                Seamlessly activate your selected audiences across multiple social and 
                programmatic platforms with a single request.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Collaborative Workspace
              </h3>
              <p className="text-gray-600">
                Share audience selections and campaign plans with your team members for 
                collaborative decision making.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Data Insights
              </h3>
              <p className="text-gray-600">
                Gain valuable insights into audience performance across campaigns to optimize 
                future targeting strategies.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-6">
                <ArrowRight className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Simplified Workflow
              </h3>
              <p className="text-gray-600">
                Our streamlined interface guides you through the process of selecting audiences 
                and building campaigns with ease.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="bg-gray-50 border-t border-gray-200 py-20">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to boost your campaign performance?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get started with Boost Data today and discover the power of intelligent 
            audience targeting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button variant="primary" size="lg">
                Sign In
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Request Demo
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;