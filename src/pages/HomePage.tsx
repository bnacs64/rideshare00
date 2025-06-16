import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Zap, DollarSign, Shield, ArrowRight, Users, MapPin, Clock, Settings } from 'lucide-react'

export const HomePage: React.FC = () => {
  const { user } = useAuth()

  // Check if email validation bypass is enabled for development
  const bypassValidation = import.meta.env.VITE_BYPASS_EMAIL_VALIDATION === 'true'
  const emailDomain = import.meta.env.VITE_NSU_EMAIL_DOMAIN || '@northsouth.edu'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NSU Commute
              </h1>
              {bypassValidation && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                  <Settings className="w-3 h-3 mr-1" />
                  Dev Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {user ? (
                <Button asChild className="shadow-md">
                  <Link to="/dashboard">
                    Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="hover:bg-white/50">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="shadow-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Link to="/register">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 border-blue-200">
              <Zap className="w-4 h-4 mr-2" />
              AI-Powered Matching
            </Badge>
          </div>
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl md:text-6xl leading-tight">
            Smart Ride Sharing for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> NSU Students</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground sm:text-xl md:mt-8 leading-relaxed">
            AI-powered ride matching that automatically connects you with fellow NSU students for efficient,
            cost-effective commuting to campus. Save money, make friends, and reduce your carbon footprint.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center md:mt-12">
            {!user && (
              <>
                <Button size="lg" asChild className="text-lg px-8 py-4 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200">
                  <Link to="/register">
                    Join NSU Commute
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4 border-2 hover:bg-white/50">
                  <Link to="/login">
                    <Users className="w-5 h-5 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">1,200+</div>
              <div className="text-sm text-muted-foreground">Rides Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">₹50,000+</div>
              <div className="text-sm text-muted-foreground">Money Saved</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">Why Choose NSU Commute?</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of student transportation with our innovative features designed specifically for NSU students.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader>
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mx-auto shadow-lg">
                  <Zap className="h-8 w-8" />
                </div>
                <CardTitle className="mt-6 text-xl">AI-Powered Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Our intelligent system automatically matches you with compatible riders and drivers based on your route, schedule, and preferences.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader>
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white mx-auto shadow-lg">
                  <DollarSign className="h-8 w-8" />
                </div>
                <CardTitle className="mt-6 text-xl">Smart Cost Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Fair and transparent cost sharing among riders, making commuting affordable for everyone. Save up to 70% on transportation costs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader>
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white mx-auto shadow-lg">
                  <Shield className="h-8 w-8" />
                </div>
                <CardTitle className="mt-6 text-xl">NSU Exclusive & Safe</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Secure platform exclusively for NSU students with university email verification and comprehensive safety features.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Real-time Tracking</h4>
                <p className="text-sm text-muted-foreground">Track your ride in real-time for peace of mind</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Flexible Scheduling</h4>
                <p className="text-sm text-muted-foreground">Schedule rides that fit your class timetable</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Community Driven</h4>
                <p className="text-sm text-muted-foreground">Connect with fellow NSU students and make friends</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">How It Works</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in just a few simple steps and join the NSU commuting revolution
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center group">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white mx-auto text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                1
              </div>
              <h4 className="mt-6 text-lg font-semibold text-foreground">Sign Up</h4>
              <p className="mt-2 text-base text-muted-foreground">Register with your NSU email address and verify your student status</p>
            </div>
            <div className="text-center group">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white mx-auto text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                2
              </div>
              <h4 className="mt-6 text-lg font-semibold text-foreground">Set Preferences</h4>
              <p className="mt-2 text-base text-muted-foreground">Choose your role, pickup locations, and preferred schedule</p>
            </div>
            <div className="text-center group">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white mx-auto text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                3
              </div>
              <h4 className="mt-6 text-lg font-semibold text-foreground">Get Matched</h4>
              <p className="mt-2 text-base text-muted-foreground">Our AI finds the perfect ride matches based on your preferences</p>
            </div>
            <div className="text-center group">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white mx-auto text-xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                4
              </div>
              <h4 className="mt-6 text-lg font-semibold text-foreground">Start Riding</h4>
              <p className="mt-2 text-base text-muted-foreground">Receive notifications and enjoy your smart, affordable commute</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NSU Commute
              </h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Making campus commuting smarter, safer, and more affordable for NSU students.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                © 2024 NSU Commute. Built with ❤️ for North South University students.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
