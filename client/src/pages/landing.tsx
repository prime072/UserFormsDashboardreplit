import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, Zap, Users, BarChart3, Share2, Lock } from "lucide-react";
import generatedImage from "@assets/generated_images/abstract_geometric_shapes_in_blue_and_indigo_on_white_background.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">FF</div>
            <span className="text-xl font-display font-bold text-slate-900">FormFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <span className="px-6 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors cursor-pointer">Login</span>
            </Link>
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-6xl font-display font-bold text-slate-900 mb-6 leading-tight">
              Build Forms That <span className="bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">Convert</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Create professional forms in minutes without coding. Collect responses, analyze data, and automate your workflow with FormFlow's intuitive builder.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth">
                <Button className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 h-12 text-base px-8" data-testid="button-start-free">
                  Get Started
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-6">No credit card required. Free forever plan available.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-96 lg:h-full min-h-96 rounded-2xl overflow-hidden shadow-2xl"
          >
            <img
              src={generatedImage}
              alt="FormFlow interface"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">Why Choose FormFlow?</h2>
            <p className="text-xl text-slate-600">Everything you need to create and manage beautiful forms</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Build professional forms in minutes with our intuitive drag-and-drop interface"
              },
              {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Get real-time insights into your form submissions with powerful analytics dashboard"
              },
              {
                icon: Share2,
                title: "Easy Sharing",
                description: "Share your forms via unique links or embed them directly on your website"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Collaborate with your team in real-time and manage multiple forms effortlessly"
              },
              {
                icon: Lock,
                title: "Enterprise Security",
                description: "Your data is safe with end-to-end encryption and regular security audits"
              },
              {
                icon: CheckCircle,
                title: "Multiple Exports",
                description: "Export responses as Excel, Word, or PDF for further analysis and reporting"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-8 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all"
                data-testid={`feature-card-${index}`}
              >
                <feature.icon className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: "10K+", label: "Active Users" },
              { number: "2M+", label: "Forms Created" },
              { number: "50M+", label: "Responses Collected" },
              { number: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <p className="text-4xl font-display font-bold text-indigo-600 mb-2">{stat.number}</p>
                <p className="text-slate-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-display font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of teams using FormFlow to collect and analyze data</p>
            <Link href="/auth">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-slate-100 text-lg px-10 py-6 font-semibold"
                data-testid="button-start-now"
              >
                Start Building Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">FF</div>
                <span className="font-bold text-lg">FormFlow</span>
              </div>
              <p className="text-slate-400">Create professional forms instantly</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2024 FormFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
