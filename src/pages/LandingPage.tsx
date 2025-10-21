import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, BarChart3, Users, Zap, Target, TrendingUp, Award, CheckCircle, ArrowRight, BookCheck, FileText, MessageCircle, Sparkles, Brain, Rocket, Star } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const parallaxOffset = scrollY * 0.5;
  const mouseParallaxX = (mousePosition.x - window.innerWidth / 2) * 0.02;
  const mouseParallaxY = (mousePosition.y - window.innerHeight / 2) * 0.02;

  return (
    <div className="min-h-screen bg-neo-white overflow-hidden">
      {/* Header - Enhanced with gradient hover */}
      <header className="border-b-4 border-neo-black bg-neo-cyan relative z-50 sticky top-0 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <BookCheck size={32} className="sm:w-10 sm:h-10 text-neo-black group-hover:rotate-12 transition-transform" strokeWidth={3} />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase group-hover:text-neo-pink transition-colors">EDUGRADE</h1>
          </div>
          <div className="flex gap-2 sm:gap-4">
            <button onClick={() => navigate('/login')} className="btn-brutal-white hover:bg-neo-purple hover:text-white hover:scale-105 transition-all text-sm sm:text-base px-3 sm:px-6">
              LOGIN
            </button>
            <button onClick={() => navigate('/signup')} className="btn-brutal-primary hover:scale-105 transition-all relative overflow-hidden group text-sm sm:text-base px-3 sm:px-6">
              <span className="relative z-10 transition-colors group-hover:text-white">SIGN UP</span>
              <div className="absolute inset-0 bg-neo-purple transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Enhanced Animations */}
      <section className="relative py-8 sm:py-12 md:py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-neo-white via-neo-white to-neo-cyan/20">
        {/* Enhanced Animated Background Shapes with Parallax */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block">
          <div
            className="absolute top-20 left-10 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 border-4 border-neo-cyan bg-neo-cyan opacity-20 rotate-12 animate-float"
            style={{ transform: `translateY(${parallaxOffset * 0.5}px) translateX(${mouseParallaxX * 2}px)` }}
          ></div>
          <div
            className="absolute top-40 right-20 w-12 sm:w-16 md:w-24 h-12 sm:h-16 md:h-24 border-4 border-neo-pink bg-neo-pink opacity-20 -rotate-12 animate-float-delayed"
            style={{ transform: `translateY(${parallaxOffset * 0.3}px) translateX(${-mouseParallaxX * 2}px)` }}
          ></div>
          <div
            className="absolute bottom-20 left-1/4 w-20 sm:w-32 md:w-40 h-20 sm:h-32 md:h-40 border-4 border-neo-yellow bg-neo-yellow opacity-20 rotate-45 animate-float"
            style={{ transform: `translateY(${-parallaxOffset * 0.4}px) translateX(${mouseParallaxY * 2}px)` }}
          ></div>
          <div
            className="absolute top-1/2 right-10 w-12 sm:w-16 md:w-20 h-12 sm:h-16 md:h-20 border-4 border-neo-green bg-neo-green opacity-20 animate-float-delayed"
            style={{ transform: `translateY(${parallaxOffset * 0.6}px) translateX(${-mouseParallaxY * 2}px)` }}
          ></div>
          {/* Additional floating sparkles */}
          <Sparkles className="absolute top-1/3 left-1/3 w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 text-neo-yellow opacity-30 animate-pulse" />
          <Star className="absolute bottom-1/3 right-1/4 w-10 sm:w-12 md:w-16 h-10 sm:h-12 md:h-16 text-neo-pink opacity-20 animate-spin" style={{ animationDuration: '10s' }} />
          <Brain className="absolute top-1/4 right-1/3 w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 text-neo-purple opacity-20 animate-bounce" style={{ animationDuration: '3s' }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div className="space-y-8">
              {/* Enhanced Feature Badges with hover effects */}
              <div className="flex flex-wrap gap-3 animate-fade-in">
                <div className="inline-block px-4 py-2 border-4 border-neo-black bg-neo-cyan shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all cursor-pointer group">
                  <span className="font-bold uppercase text-sm flex items-center gap-2">
                    <Zap size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                    AI-POWERED GRADING
                  </span>
                </div>
                <div className="inline-block px-4 py-2 border-4 border-neo-black bg-neo-pink shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all cursor-pointer group">
                  <span className="font-bold uppercase text-sm flex items-center gap-2">
                    <FileText size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                    GOOGLE VISION OCR
                  </span>
                </div>
                <div className="inline-block px-4 py-2 border-4 border-neo-black bg-neo-purple text-white shadow-brutal-sm hover:shadow-brutal hover:-translate-y-1 transition-all cursor-pointer group">
                  <span className="font-bold uppercase text-sm flex items-center gap-2">
                    <MessageCircle size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                    AI STUDY BUDDY
                  </span>
                </div>
              </div>

              {/* Enhanced Headline with gradient text effect */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold uppercase leading-tight animate-slide-up">
                GRADE<br />
                <span className="text-neo-pink hover:text-neo-cyan transition-colors cursor-default inline-block hover:scale-105 transform">SMARTER.</span><br />
                TEACH<br />
                <span className="text-neo-cyan hover:text-neo-pink transition-colors cursor-default inline-block hover:scale-105 transform">BETTER.</span>
              </h2>

              <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed font-bold animate-fade-in-delayed">
                The brutally efficient platform for teachers and students. <span className="text-neo-purple">No fluff. Just results.</span>
              </p>
              
              {/* Enhanced CTA Buttons */}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="btn-brutal-primary text-sm sm:text-base md:text-lg lg:text-xl flex items-center gap-2 group hover:scale-105 transition-all relative overflow-hidden"
                >
                  <Rocket size={20} className="sm:w-6 sm:h-6" strokeWidth={3} />
                  <span className="relative z-10">GET STARTED</span>
                  <ArrowRight size={20} className="sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                  <div className="absolute inset-0 bg-neo-yellow transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-brutal-secondary text-sm sm:text-base md:text-lg lg:text-xl hover:scale-105 hover:bg-neo-cyan transition-all"
                >
                  LOGIN
                </button>
              </div>

              {/* Enhanced Stats with hover animations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-8 sm:mt-12">
                <div className="card-brutal p-2 sm:p-3 md:p-4 bg-neo-white text-center hover:bg-neo-pink hover:text-white hover:-translate-y-2 transition-all cursor-pointer group">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-neo-pink group-hover:text-white group-hover:scale-110 transition-all">10K+</div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-60 group-hover:opacity-100">STUDENTS</div>
                </div>
                <div className="card-brutal p-2 sm:p-3 md:p-4 bg-neo-white text-center hover:bg-neo-cyan hover:-translate-y-2 transition-all cursor-pointer group">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-neo-cyan group-hover:text-black group-hover:scale-110 transition-all">500+</div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-60 group-hover:opacity-100">TEACHERS</div>
                </div>
                <div className="card-brutal p-2 sm:p-3 md:p-4 bg-neo-white text-center hover:bg-neo-green hover:-translate-y-2 transition-all cursor-pointer group">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-neo-green group-hover:text-black group-hover:scale-110 transition-all">99%</div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase opacity-60 group-hover:opacity-100">ACCURACY</div>
                </div>
              </div>
            </div>

            {/* Enhanced Hero Visual with 3D effect */}
            <div className="relative animate-fade-in-delayed hidden md:block">
              <div className="relative w-full aspect-square max-w-lg mx-auto group">
                {/* Enhanced Card Stack with hover 3D effect */}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `perspective(1000px) rotateY(${mouseParallaxX * 0.5}deg) rotateX(${-mouseParallaxY * 0.5}deg)`
                  }}
                >
                  {/* Back Card */}
                  <div className="absolute w-full h-full card-brutal bg-neo-pink transform rotate-6 translate-x-4 translate-y-4 group-hover:rotate-12 group-hover:translate-x-6 group-hover:translate-y-6 transition-all duration-300"></div>
                  
                  {/* Middle Card */}
                  <div className="absolute w-full h-full card-brutal bg-neo-cyan transform rotate-3 translate-x-2 translate-y-2 group-hover:rotate-6 group-hover:translate-x-3 group-hover:translate-y-3 transition-all duration-300"></div>
                  
                  {/* Front Card - Grade Display with enhanced animations */}
                  <div className="relative w-full h-full card-brutal bg-neo-white p-8 flex flex-col justify-between group-hover:shadow-brutal-lg transition-all duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between animate-slide-down">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 border-4 border-neo-black bg-neo-yellow flex items-center justify-center group-hover:rotate-12 transition-transform">
                          <GraduationCap size={24} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="font-bold uppercase text-sm">ASSIGNMENT</div>
                          <div className="text-xs opacity-60">MATH QUIZ #3</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 border-4 border-neo-black bg-neo-green font-bold text-xs animate-pulse">
                        GRADED ✓
                      </div>
                    </div>

                    {/* Enhanced Score Circle with animated gradient */}
                    <div className="flex items-center justify-center my-8">
                      <div className="relative w-48 h-48 group-hover:scale-110 transition-transform duration-300">
                        {/* Outer Ring */}
                        <div className="absolute inset-0 border-8 border-neo-black rounded-full"></div>
                        
                        {/* Animated Progress Ring */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="#00F0FF"
                            strokeWidth="16"
                            strokeDasharray="553"
                            strokeDashoffset="83"
                            className="transition-all duration-1000 animate-dash"
                          />
                        </svg>
                        
                        {/* Center Score with pulse effect */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-6xl font-bold group-hover:scale-110 transition-transform">95</div>
                            <div className="text-xl font-bold opacity-60">/100</div>
                          </div>
                        </div>
                        
                        {/* Floating sparkle on hover */}
                        <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-neo-yellow opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                      </div>
                    </div>

                    {/* Enhanced Feedback Preview with stagger animation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 animate-slide-right" style={{ animationDelay: '0.1s' }}>
                        <CheckCircle size={16} strokeWidth={3} className="text-neo-green animate-bounce" style={{ animationDuration: '2s' }} />
                        <div className="h-2 flex-1 bg-neo-green border-2 border-neo-black"></div>
                      </div>
                      <div className="flex items-center gap-2 animate-slide-right" style={{ animationDelay: '0.2s' }}>
                        <CheckCircle size={16} strokeWidth={3} className="text-neo-green animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
                        <div className="h-2 flex-1 bg-neo-green border-2 border-neo-black"></div>
                      </div>
                      <div className="flex items-center gap-2 animate-slide-right" style={{ animationDelay: '0.3s' }}>
                        <CheckCircle size={16} strokeWidth={3} className="text-neo-cyan animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.4s' }} />
                        <div className="h-2 w-3/4 bg-neo-cyan border-2 border-neo-black"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Floating Icons with more animations */}
                <div className="absolute -top-4 -left-4 w-16 h-16 card-brutal bg-neo-yellow flex items-center justify-center animate-bounce-slow hover:rotate-12 hover:scale-110 transition-all cursor-pointer">
                  <Award size={32} strokeWidth={3} />
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 card-brutal bg-neo-pink flex items-center justify-center animate-bounce-slow hover:rotate-12 hover:scale-110 transition-all cursor-pointer" style={{ animationDelay: '0.5s' }}>
                  <TrendingUp size={32} strokeWidth={3} className="text-neo-white" />
                </div>
                <div className="absolute top-1/2 -left-6 w-12 h-12 card-brutal bg-neo-purple flex items-center justify-center animate-pulse hover:scale-110 transition-all cursor-pointer">
                  <Brain size={24} strokeWidth={3} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section with wave animation */}
      <section className="bg-gradient-to-br from-neo-pink via-neo-pink to-neo-purple border-y-4 border-neo-black py-8 sm:py-12 md:py-16 lg:py-20 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10 hidden sm:block">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 h-full animate-pulse">
            {[...Array(64)].map((_, i) => (
              <div 
                key={i} 
                className="border-2 border-neo-white hover:bg-neo-white transition-all cursor-pointer"
                style={{ animationDelay: `${i * 0.05}s` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Floating shapes */}
        <Sparkles className="absolute top-10 right-10 w-20 h-20 text-neo-white opacity-20 animate-spin" style={{ animationDuration: '8s' }} />
        <Star className="absolute bottom-20 left-20 w-16 h-16 text-neo-yellow opacity-30 animate-pulse" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase text-neo-white mb-4 hover:scale-105 transition-transform cursor-default">
              FEATURES THAT <span className="text-neo-yellow">WORK</span>
            </h3>
            <p className="text-base sm:text-lg md:text-xl text-neo-white font-bold opacity-90">
              EVERYTHING YOU NEED. <span className="text-neo-cyan">NOTHING YOU DON'T.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                icon: <BookOpen size={48} strokeWidth={3} />,
                title: 'SMART ASSIGNMENTS',
                desc: 'Create, distribute, and manage assignments with AI-powered grading. Upload once, grade instantly.',
                color: 'bg-neo-cyan',
              },
              {
                icon: <BarChart3 size={48} strokeWidth={3} />,
                title: 'REAL-TIME ANALYTICS',
                desc: 'Track student progress with brutal honesty. Data-driven insights that actually matter.',
                color: 'bg-neo-yellow',
              },
              {
                icon: <Users size={48} strokeWidth={3} />,
                title: 'SEAMLESS COLLABORATION',
                desc: 'Connect teachers and students. Simple. Direct. Effective. No unnecessary complexity.',
                color: 'bg-neo-green',
              },
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="group"
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="card-brutal p-8 bg-neo-white hover:bg-gradient-to-br hover:from-white hover:to-neo-cyan/20 hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all duration-300 h-full relative overflow-hidden">
                  {/* Animated background on hover */}
                  <div className={`absolute inset-0 ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  {/* Icon Container with 3D effect */}
                  <div className={`inline-flex p-4 border-4 border-neo-black ${feature.color} mb-6 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 relative z-10`}>
                    <div className="group-hover:animate-bounce">
                      {feature.icon}
                    </div>
                  </div>
                  
                  <h4 className="text-2xl font-bold uppercase mb-4 group-hover:text-neo-pink transition-colors relative z-10">{feature.title}</h4>
                  <p className="text-lg leading-relaxed relative z-10">{feature.desc}</p>

                  {/* Enhanced Feature Bars with animation */}
                  <div className="mt-6 space-y-2 relative z-10">
                    <div className={`h-2 bg-neo-black opacity-20 group-hover:opacity-100 group-hover:${feature.color} transition-all duration-300`}></div>
                    <div className={`h-2 bg-neo-black opacity-20 w-4/5 group-hover:opacity-100 group-hover:${feature.color} transition-all duration-300 delay-75`}></div>
                    <div className={`h-2 bg-neo-black opacity-20 w-3/5 group-hover:opacity-100 group-hover:${feature.color} transition-all duration-300 delay-150`}></div>
                  </div>
                  
                  {/* Hover sparkle effect */}
                  {hoveredFeature === idx && (
                    <Sparkles className="absolute top-4 right-4 w-8 h-8 text-neo-yellow animate-ping" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced How It Works Section with interactive timeline */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-neo-white via-neo-cyan/10 to-neo-white relative overflow-hidden">
        {/* Decorative floating elements */}
        <div className="absolute top-10 right-10 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 border-4 border-neo-pink bg-neo-pink/10 rotate-12 animate-float hidden sm:block"></div>
        <div className="absolute bottom-20 left-10 w-12 sm:w-16 md:w-24 h-12 sm:h-16 md:h-24 border-4 border-neo-yellow bg-neo-yellow/10 -rotate-12 animate-float-delayed hidden sm:block"></div>
        <Rocket className="absolute top-1/4 left-1/4 w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 text-neo-purple/20 animate-bounce hidden sm:block" style={{ animationDuration: '3s' }} />

        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <div className="inline-block mb-4 px-6 py-2 border-4 border-neo-black bg-neo-yellow shadow-brutal-sm animate-bounce-slow">
              <span className="font-bold uppercase text-sm flex items-center gap-2">
                <Sparkles size={16} strokeWidth={3} />
                SIMPLE & POWERFUL
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase mb-4 hover:scale-105 transition-transform cursor-default">
              HOW IT <span className="text-neo-pink">WORKS</span>
            </h3>
            <p className="text-base sm:text-lg md:text-xl font-bold opacity-60">
              THREE SIMPLE STEPS TO <span className="text-neo-cyan">SUCCESS</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'UPLOAD',
                desc: 'Students submit assignments through our simple upload interface.',
                icon: <Upload size={40} strokeWidth={3} />,
                color: 'bg-neo-cyan',
                detail: 'PDF, DOCX, Images supported'
              },
              {
                step: '02',
                title: 'AI GRADES',
                desc: 'Our AI analyzes submissions and provides detailed feedback instantly.',
                icon: <Zap size={40} strokeWidth={3} />,
                color: 'bg-neo-yellow',
                detail: 'Results in under 30 seconds'
              },
              {
                step: '03',
                title: 'IMPROVE',
                desc: 'Students review feedback and improve. Teachers track progress effortlessly.',
                icon: <Target size={40} strokeWidth={3} />,
                color: 'bg-neo-green',
                detail: 'Real-time insights & analytics'
              },
            ].map((step, idx) => (
              <div key={idx} className="relative group">
                {/* Enhanced Connector Line with animation */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-28 left-full w-full h-2 bg-neo-black/20 -z-10 overflow-hidden">
                    <div className="h-full bg-neo-pink transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-neo-black"></div>
                  </div>
                )}

                <div className="text-center card-brutal p-8 bg-neo-white hover:bg-gradient-to-br hover:from-white hover:to-cyan-50 hover:-translate-y-2 hover:shadow-brutal-lg transition-all duration-300 relative overflow-hidden">
                  {/* Animated background on hover */}
                  <div className={`absolute inset-0 ${step.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  {/* Step Number with pulse effect */}
                  <div className="inline-flex items-center justify-center w-20 h-20 border-4 border-neo-black bg-neo-white shadow-brutal mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10">
                    <span className="text-3xl font-bold group-hover:text-neo-pink transition-colors">{step.step}</span>
                  </div>

                  {/* Icon with animation */}
                  <div className={`inline-flex p-6 border-4 border-neo-black ${step.color} shadow-brutal mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10`}>
                    <div className="group-hover:animate-bounce">
                      {step.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <h4 className="text-2xl font-bold uppercase mb-4 group-hover:text-neo-pink transition-colors relative z-10">{step.title}</h4>
                  <p className="text-lg mb-4 relative z-10">{step.desc}</p>
                  
                  {/* Detail badge */}
                  <div className="inline-block px-4 py-2 border-2 border-neo-black bg-neo-white/50 text-sm font-bold opacity-60 group-hover:opacity-100 group-hover:bg-neo-yellow transition-all relative z-10">
                    {step.detail}
                  </div>

                  {/* Sparkle effect on hover */}
                  <Sparkles className="absolute top-4 right-4 w-8 h-8 text-neo-yellow opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          {/* Additional visual: Time savings banner */}
          <div className="mt-16 text-center">
            <div className="inline-block card-brutal px-8 py-4 bg-gradient-to-r from-neo-pink to-neo-purple hover:scale-105 transition-transform cursor-pointer">
              <p className="text-white font-bold text-xl flex items-center gap-3">
                <Zap size={24} strokeWidth={3} className="animate-pulse" />
                <span>Save 10+ hours per week with automated grading!</span>
                <Zap size={24} strokeWidth={3} className="animate-pulse" />
              </p>
            </div>
          </div>

          {/* OCR Technology Feature */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="card-brutal p-8 bg-gradient-to-br from-neo-white to-neo-cyan/20 hover:shadow-brutal-lg transition-all group">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 border-4 border-neo-black bg-neo-pink flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300">
                    <FileText size={48} strokeWidth={3} className="text-white group-hover:animate-bounce" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-2xl font-bold uppercase mb-2 flex items-center justify-center md:justify-start gap-2">
                    <Sparkles size={24} strokeWidth={3} className="text-neo-yellow" />
                    <span className="group-hover:text-neo-pink transition-colors">POWERED BY GOOGLE VISION AI</span>
                  </h4>
                  <p className="text-lg mb-3">
                    Advanced OCR text extraction technology automatically reads and processes handwritten and typed assignments with industry-leading accuracy.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <div className="px-4 py-2 border-2 border-neo-black bg-neo-yellow text-sm font-bold">
                      ✓ HANDWRITING RECOGNITION
                    </div>
                    <div className="px-4 py-2 border-2 border-neo-black bg-neo-green text-sm font-bold">
                      ✓ MULTI-FORMAT SUPPORT
                    </div>
                    <div className="px-4 py-2 border-2 border-neo-black bg-neo-cyan text-sm font-bold">
                      ✓ 99%+ ACCURACY
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0">
                  <div className="px-6 py-3 border-4 border-neo-black bg-neo-purple text-white font-bold uppercase text-center shadow-brutal group-hover:animate-pulse">
                    <div className="text-xs mb-1">Powered By</div>
                    <div className="text-lg">Google Vision</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Benefits/Why EduGrade Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-neo-cyan via-neo-cyan to-neo-purple/30 border-y-4 border-neo-black relative overflow-hidden">
        {/* Animated decorative elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 bg-neo-pink rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-neo-yellow rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <Star className="absolute top-20 right-20 w-24 h-24 text-neo-white/20 animate-spin" style={{ animationDuration: '20s' }} />
        <Sparkles className="absolute bottom-20 left-20 w-20 h-20 text-neo-yellow/30 animate-pulse" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <div className="inline-block mb-4 px-6 py-2 border-4 border-neo-black bg-neo-pink text-white shadow-brutal-sm animate-bounce-slow">
              <span className="font-bold uppercase text-sm flex items-center gap-2">
                <Star size={16} strokeWidth={3} />
                UNMATCHED FEATURES
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase mb-4 hover:scale-105 transition-transform cursor-default">
              WHY <span className="text-neo-pink">EDUGRADE</span>?
            </h3>
            <p className="text-base sm:text-lg md:text-xl font-bold opacity-80">
              BUILT FOR <span className="text-neo-purple">MODERN EDUCATION</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
            {[
              { 
                icon: <Zap size={32} strokeWidth={3} />, 
                text: 'INSTANT GRADING',
                color: 'bg-neo-yellow',
                desc: 'Results in seconds'
              },
              { 
                icon: <Target size={32} strokeWidth={3} />, 
                text: 'ACCURATE FEEDBACK',
                color: 'bg-neo-pink',
                desc: '99% precision rate'
              },
              { 
                icon: <TrendingUp size={32} strokeWidth={3} />, 
                text: 'TRACK PROGRESS',
                color: 'bg-neo-green',
                desc: 'Real-time insights'
              },
              { 
                icon: <Award size={32} strokeWidth={3} />, 
                text: 'IMPROVE SCORES',
                color: 'bg-neo-purple',
                desc: 'Avg 25% boost'
              },
              { 
                icon: <Users size={32} strokeWidth={3} />, 
                text: 'EASY COLLABORATION',
                color: 'bg-neo-cyan',
                desc: 'Connect instantly'
              },
              { 
                icon: <BarChart3 size={32} strokeWidth={3} />, 
                text: 'DETAILED ANALYTICS',
                color: 'bg-neo-pink',
                desc: 'Deep insights'
              },
              { 
                icon: <BookOpen size={32} strokeWidth={3} />, 
                text: 'UNLIMITED ASSIGNMENTS',
                color: 'bg-neo-yellow',
                desc: 'No restrictions'
              },
              { 
                icon: <CheckCircle size={32} strokeWidth={3} />, 
                text: 'PROVEN RESULTS',
                color: 'bg-neo-green',
                desc: '10K+ students'
              },
            ].map((benefit, idx) => (
              <div 
                key={idx} 
                className="card-brutal p-6 bg-neo-white text-center hover:-translate-y-2 hover:shadow-brutal-lg transition-all duration-300 group cursor-pointer relative overflow-hidden"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Animated background on hover */}
                <div className={`absolute inset-0 ${benefit.color} opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-0 group-hover:scale-100`}></div>
                
                {/* Icon with rotation effect */}
                <div className="mb-4 flex justify-center relative z-10">
                  <div className={`p-3 border-4 border-neo-black ${benefit.color} group-hover:rotate-12 group-hover:scale-110 transition-all duration-300`}>
                    <div className="group-hover:animate-bounce">
                      {benefit.icon}
                    </div>
                  </div>
                </div>
                
                {/* Text content with conditional color for yellow backgrounds */}
                <div className={`font-bold uppercase text-sm mb-2 relative z-10 transition-colors ${
                  benefit.color === 'bg-neo-yellow' 
                    ? 'group-hover:text-black' 
                    : 'group-hover:text-white'
                }`}>
                  {benefit.text}
                </div>
                <div className={`text-xs opacity-60 group-hover:opacity-100 relative z-10 transition-all ${
                  benefit.color === 'bg-neo-yellow' 
                    ? 'group-hover:text-black' 
                    : 'group-hover:text-white'
                }`}>
                  {benefit.desc}
                </div>

                {/* Sparkle effect */}
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-neo-yellow opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
              </div>
            ))}
          </div>

          {/* Big stats banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
            <div className="card-brutal p-8 bg-neo-white text-center hover:bg-neo-pink hover:text-white hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
              <div className="text-5xl font-bold mb-2 text-neo-pink group-hover:text-white group-hover:scale-110 transition-all">
                10,000+
              </div>
              <div className="text-lg font-bold uppercase">Happy Students</div>
              <div className="text-sm opacity-60 group-hover:opacity-100 mt-2">And growing every day!</div>
            </div>
            <div className="card-brutal p-8 bg-neo-white text-center hover:bg-neo-cyan hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
              <div className="text-5xl font-bold mb-2 text-neo-cyan group-hover:text-black group-hover:scale-110 transition-all">
                99%
              </div>
              <div className="text-lg font-bold uppercase">Accuracy Rate</div>
              <div className="text-sm opacity-60 group-hover:opacity-100 mt-2">AI-powered precision</div>
            </div>
            <div className="card-brutal p-8 bg-neo-white text-center hover:bg-neo-green hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
              <div className="text-5xl font-bold mb-2 text-neo-green group-hover:text-black group-hover:scale-110 transition-all">
                10hrs
              </div>
              <div className="text-lg font-bold uppercase">Saved Weekly</div>
              <div className="text-sm opacity-60 group-hover:opacity-100 mt-2">Per teacher average</div>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-4 card-brutal px-8 py-4 bg-neo-white hover:scale-105 transition-transform cursor-pointer">
              <Award size={32} strokeWidth={3} className="text-neo-yellow animate-pulse" />
              <span className="font-bold text-xl">Trusted by educators worldwide</span>
              <Award size={32} strokeWidth={3} className="text-neo-yellow animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section with animations */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-neo-white relative overflow-hidden">
        {/* Floating background elements */}
        <Sparkles className="absolute top-10 left-10 w-24 h-24 text-neo-yellow opacity-20 animate-spin" style={{ animationDuration: '15s' }} />
        <Star className="absolute bottom-10 right-10 w-20 h-20 text-neo-cyan opacity-20 animate-pulse" />
        <Brain className="absolute top-1/2 left-20 w-16 h-16 text-neo-purple opacity-10 animate-bounce" style={{ animationDuration: '4s' }} />
        
        <div className="container mx-auto px-4 sm:px-6">
          <div className="card-brutal p-6 sm:p-8 md:p-12 lg:p-16 bg-gradient-to-br from-neo-pink via-neo-pink to-neo-purple text-center relative overflow-hidden group hover:shadow-brutal-lg transition-all duration-300">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 border-8 border-neo-white rotate-45 group-hover:rotate-90 transition-transform duration-700"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 border-8 border-neo-white rotate-45 group-hover:-rotate-90 transition-transform duration-700"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-8 border-neo-white rounded-full group-hover:scale-125 transition-transform duration-700"></div>
            </div>

            {/* Floating sparkles on hover */}
            <Sparkles className="absolute top-8 right-8 w-12 h-12 text-neo-yellow opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
            <Sparkles className="absolute bottom-8 left-8 w-12 h-12 text-neo-cyan opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" style={{ animationDelay: '0.2s' }} />

            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold uppercase mb-4 sm:mb-6 text-neo-white animate-fade-in group-hover:scale-105 transition-transform">
                READY TO <span className="text-neo-yellow">TRANSFORM</span><br />
                <span className="text-neo-cyan">EDUCATION</span>?
              </h3>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-neo-white font-bold animate-fade-in-delayed">
                Join <span className="text-neo-yellow">10,000+</span> teachers and students already using EDUGRADE.
              </p>
              <div className="flex flex-wrap gap-4 justify-center mb-8">
                <button 
                  onClick={() => navigate('/signup')} 
                  className="btn-brutal bg-neo-white text-neo-black text-xl px-8 py-4 flex items-center gap-2 hover:scale-110 hover:bg-neo-yellow transition-all duration-300 relative overflow-hidden group/btn"
                >
                  <Rocket size={24} strokeWidth={3} className="group-hover/btn:translate-y-1 transition-transform" />
                  <span className="relative z-10">START FREE TODAY</span>
                  <ArrowRight size={24} strokeWidth={3} className="group-hover/btn:translate-x-2 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/login')} 
                  className="btn-brutal bg-neo-cyan text-neo-black text-xl px-8 py-4 hover:scale-110 hover:bg-neo-yellow transition-all duration-300"
                >
                  LOGIN NOW
                </button>
              </div>

              {/* Enhanced Trust Indicators with icons */}
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-neo-white">
                <div className="flex items-center gap-2 hover:scale-110 transition-transform cursor-pointer group/indicator">
                  <CheckCircle size={24} strokeWidth={3} className="group-hover/indicator:animate-bounce" />
                  <span className="font-bold">NO CREDIT CARD</span>
                </div>
                <div className="flex items-center gap-2 hover:scale-110 transition-transform cursor-pointer group/indicator">
                  <CheckCircle size={24} strokeWidth={3} className="group-hover/indicator:animate-bounce" />
                  <span className="font-bold">FREE FOREVER</span>
                </div>
                <div className="flex items-center gap-2 hover:scale-110 transition-transform cursor-pointer group/indicator">
                  <CheckCircle size={24} strokeWidth={3} className="group-hover/indicator:animate-bounce" />
                  <span className="font-bold">INSTANT ACCESS</span>
                </div>
              </div>

              {/* Bonus: Animated stat line */}
              <div className="mt-8 pt-8 border-t-4 border-neo-white/20">
                <p className="text-lg text-neo-white font-bold flex items-center justify-center gap-2">
                  <Zap size={20} strokeWidth={3} className="text-neo-yellow animate-pulse" />
                  <span className="animate-pulse">Join the revolution in education technology!</span>
                  <Zap size={20} strokeWidth={3} className="text-neo-yellow animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t-4 border-neo-black bg-neo-black text-neo-white py-8 sm:py-12 md:py-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 border-4 border-neo-cyan/20 rotate-45 animate-spin" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 border-4 border-neo-pink/20 -rotate-12 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neo-purple/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="group">
              <div className="flex items-center gap-2 mb-4 group-hover:scale-105 transition-transform cursor-pointer">
                <div className="p-2 border-4 border-neo-cyan bg-neo-cyan group-hover:rotate-12 transition-transform">
                  <GraduationCap size={32} strokeWidth={3} className="text-black" />
                </div>
                <span className="text-2xl font-bold uppercase group-hover:text-neo-cyan transition-colors">EDUGRADE</span>
              </div>
              <p className="text-sm opacity-80 mb-4 group-hover:opacity-100 transition-opacity">
                The brutally efficient platform for modern education. Powered by AI.
              </p>
              {/* Social icons placeholder */}
              <div className="flex gap-3">
                <div className="w-10 h-10 border-4 border-neo-white bg-neo-pink hover:bg-neo-cyan hover:scale-110 transition-all cursor-pointer flex items-center justify-center">
                  <span className="font-bold">𝕏</span>
                </div>
                <div className="w-10 h-10 border-4 border-neo-white bg-neo-pink hover:bg-neo-cyan hover:scale-110 transition-all cursor-pointer flex items-center justify-center">
                  <span className="font-bold">in</span>
                </div>
                <div className="w-10 h-10 border-4 border-neo-white bg-neo-pink hover:bg-neo-cyan hover:scale-110 transition-all cursor-pointer flex items-center justify-center">
                  <span className="font-bold">@</span>
                </div>
              </div>
            </div>

            <div className="group">
              <h4 className="font-bold uppercase mb-4 flex items-center gap-2 group-hover:text-neo-cyan transition-colors">
                <Zap size={16} strokeWidth={3} />
                PRODUCT
              </h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 hover:text-neo-cyan hover:translate-x-2 inline-block transition-all">→ Features</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-cyan hover:translate-x-2 inline-block transition-all">→ AI Grading</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-cyan hover:translate-x-2 inline-block transition-all">→ OCR Technology</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-cyan hover:translate-x-2 inline-block transition-all">→ Study Buddy</a></li>
              </ul>
            </div>

            <div className="group">
              <h4 className="font-bold uppercase mb-4 flex items-center gap-2 group-hover:text-neo-pink transition-colors">
                <Users size={16} strokeWidth={3} />
                COMPANY
              </h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 hover:text-neo-pink hover:translate-x-2 inline-block transition-all">→ About Us</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-pink hover:translate-x-2 inline-block transition-all">→ Blog</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-pink hover:translate-x-2 inline-block transition-all">→ Careers</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-pink hover:translate-x-2 inline-block transition-all">→ Contact</a></li>
              </ul>
            </div>

            <div className="group">
              <h4 className="font-bold uppercase mb-4 flex items-center gap-2 group-hover:text-neo-yellow transition-colors">
                <CheckCircle size={16} strokeWidth={3} />
                LEGAL
              </h4>
              <ul className="space-y-3 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 hover:text-neo-yellow hover:translate-x-2 inline-block transition-all">→ Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-yellow hover:translate-x-2 inline-block transition-all">→ Terms of Service</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-yellow hover:translate-x-2 inline-block transition-all">→ Security</a></li>
                <li><a href="#" className="hover:opacity-100 hover:text-neo-yellow hover:translate-x-2 inline-block transition-all">→ Cookies</a></li>
              </ul>
            </div>
          </div>

          {/* Divider with animation */}
          <div className="relative mb-8">
            <div className="h-1 bg-neo-white/20"></div>
            <div className="absolute inset-0 h-1 bg-gradient-to-r from-neo-cyan via-neo-pink to-neo-yellow opacity-50 animate-pulse"></div>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform cursor-default">
              <Sparkles size={20} strokeWidth={3} className="text-neo-yellow animate-pulse" />
              <span>© 2025 EDUGRADE. ALL RIGHTS RESERVED.</span>
              <Sparkles size={20} strokeWidth={3} className="text-neo-yellow animate-pulse" />
            </p>
            
            {/* Tech badges */}
            <div className="flex gap-3 flex-wrap justify-center">
              <div className="px-3 py-1 border-2 border-neo-cyan text-neo-cyan text-xs font-bold hover:bg-neo-cyan hover:text-black transition-all cursor-pointer">
                POWERED BY GOOGLE VISION
              </div>
              <div className="px-3 py-1 border-2 border-neo-pink text-neo-pink text-xs font-bold hover:bg-neo-pink hover:text-white transition-all cursor-pointer">
                AI-DRIVEN
              </div>
              <div className="px-3 py-1 border-2 border-neo-yellow text-neo-yellow text-xs font-bold hover:bg-neo-yellow hover:text-black transition-all cursor-pointer">
                SUPABASE
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper component for Upload icon (not in lucide-react)
const Upload: React.FC<{ size: number; strokeWidth: number }> = ({ size, strokeWidth }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default LandingPage;
