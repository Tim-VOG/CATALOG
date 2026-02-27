import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Package, UserPlus, ArrowRight, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'motion/react'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function HubPage() {
  const { isAdmin } = useAuth()

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold tracking-tight text-gradient-primary">
          VO Gear Hub
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Welcome — choose your destination
        </p>
        <motion.div
          className="mt-4 h-0.5 w-16 rounded-full bg-primary/60 mx-auto"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Equipment Catalog */}
        <motion.div variants={item}>
          <Link to="/catalog" className="block h-full">
            <Card variant="elevated" className="h-full group hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center text-center h-full">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-display font-bold mb-2">Equipment Catalog</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                  Browse and reserve equipment for your projects. View availability, submit loan requests, and manage your reservations.
                </p>
                <Button className="gap-2 group-hover:gap-3 transition-all">
                  Open Catalog
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Onboarding Hub */}
        <motion.div variants={item}>
          {isAdmin ? (
            <Link to="/admin/onboarding" className="block h-full">
              <Card variant="elevated" className="h-full group hover:border-cyan-500/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden">
                <CardContent className="p-8 flex flex-col items-center text-center h-full">
                  <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <UserPlus className="h-8 w-8 text-cyan-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-display font-bold">Onboarding Hub</h2>
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                    Compose and send welcome emails to new team members. Manage recipients, customize email blocks, and track delivery.
                  </p>
                  <Button variant="outline" className="gap-2 group-hover:gap-3 transition-all border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
                    Open Onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card variant="elevated" className="h-full opacity-60">
              <CardContent className="p-8 flex flex-col items-center text-center h-full">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-display font-bold mb-2">Onboarding Hub</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                  Compose and send welcome emails to new team members. This section is reserved for administrators.
                </p>
                <Badge variant="outline" className="text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  Admin only
                </Badge>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
