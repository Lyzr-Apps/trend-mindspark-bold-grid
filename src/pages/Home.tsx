import { useState } from 'react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  Save,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  Zap,
  Users,
  Calendar,
  MessageSquare,
  X,
  Send,
  Menu,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Agent IDs
const BRAINSTORM_ORCHESTRATOR_ID = "6973345568d85325acf4a4a3"
const MARKET_RESEARCH_AGENT_ID = "697333e468d85325acf4a468"
const IDEATION_AGENT_ID = "69733400fd60b80b175e5903"
const STRATEGY_AGENT_ID = "6973341ffd60b80b175e5918"

// TypeScript interfaces based on ACTUAL test response data
interface TrendItem {
  trend: string
  description: string
  relevance_score: number
}

interface PainPoint {
  pain_point: string
  severity: 'high' | 'medium' | 'low'
  impact_area: string
  current_solutions: string
}

interface ProductIdea {
  idea_name: string
  description: string
  target_audience: string
  key_value_prop: string
}

interface TopIdea {
  rank: number
  idea_name: string
  description: string
  viability_score: number
  innovation_score: number
  market_fit_score: number
}

interface Feature {
  feature: string
  description: string
  competitive_advantage: string
}

interface UniqueFeatures {
  idea_name: string
  features: Feature[]
}

interface Obstacle {
  obstacle: string
  severity: 'high' | 'medium' | 'low'
  proposed_solution: string
}

interface ObstacleSet {
  idea_name: string
  obstacles: Obstacle[]
}

interface HybridConcept {
  hybrid_name: string
  parent_ideas: string[]
  description: string
  synergy_benefits: string
  innovation_score: number
}

interface Scenario {
  idea_name: string
  persona: string
  scenario: string
}

interface RankingScores {
  viability: number
  innovation: number
  market_fit: number
  feasibility: number
}

interface RankingItem {
  rank: number
  idea_name: string
  total_score: number
  scores: RankingScores
  recommendation: string
}

interface RoadmapPhase {
  timeframe: string
  activities: string[]
  deliverables: string[]
}

interface Roadmap {
  phase1_foundation: RoadmapPhase
  phase2_development: RoadmapPhase
  phase3_launch: RoadmapPhase
  phase4_scale: RoadmapPhase
}

interface BrainstormResult {
  step1_trends: TrendItem[]
  step2_pain_points: PainPoint[]
  step3_product_ideas: ProductIdea[]
  step5_top_ideas: TopIdea[]
  step6_unique_features: UniqueFeatures[]
  step7_obstacles: ObstacleSet[]
  step8_hybrid_concepts: HybridConcept[]
  step9_scenarios: Scenario[]
  step10_rankings: RankingItem[]
  step11_roadmap: Roadmap
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Session {
  id: string
  industry: string
  problem: string
  trend: string
  timestamp: string
}

// Progress steps
const PROGRESS_STEPS = [
  { id: 1, label: 'Trends', key: 'step1_trends' },
  { id: 2, label: 'Pain Points', key: 'step2_pain_points' },
  { id: 3, label: 'Ideas', key: 'step3_product_ideas' },
  { id: 4, label: 'Ideas (10)', key: 'step3_product_ideas' },
  { id: 5, label: 'Top 3', key: 'step5_top_ideas' },
  { id: 6, label: 'Features', key: 'step6_unique_features' },
  { id: 7, label: 'Obstacles', key: 'step7_obstacles' },
  { id: 8, label: 'Hybrids', key: 'step8_hybrid_concepts' },
  { id: 9, label: 'Scenarios', key: 'step9_scenarios' },
  { id: 10, label: 'Rankings', key: 'step10_rankings' },
  { id: 11, label: 'Roadmap', key: 'step11_roadmap' },
]

// Helper components defined outside to prevent re-creation
function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const variant = severity === 'high' ? 'destructive' : severity === 'medium' ? 'default' : 'secondary'
  return (
    <Badge variant={variant} className="text-xs">
      {severity}
    </Badge>
  )
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100
  return (
    <div className="space-y-1">
      <Progress value={percentage} className="h-2" />
      <span className="text-sm text-gray-600">{score}/{max}</span>
    </div>
  )
}

export default function Home() {
  // Form state
  const [industry, setIndustry] = useState('')
  const [problem, setProblem] = useState('')
  const [trend, setTrend] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<NormalizedAgentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Chat panel state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [refinementContext, setRefinementContext] = useState<string>('')

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])

  // Handle brainstorm start
  const handleStartBrainstorm = async () => {
    if (!industry.trim() || !problem.trim() || !trend.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)
    setCurrentStep(0)

    const message = `Industry: ${industry}, Problem: ${problem}, Trend: ${trend}. Generate the complete 11-step innovation framework.`

    try {
      const result = await callAIAgent(message, BRAINSTORM_ORCHESTRATOR_ID)

      if (result.success && result.response.status === 'success') {
        setResponse(result.response)
        // Simulate progressive loading
        simulateProgress()

        // Save session
        const newSession: Session = {
          id: Date.now().toString(),
          industry,
          problem,
          trend,
          timestamp: new Date().toISOString()
        }
        setSessions(prev => [newSession, ...prev])
      } else {
        setError(result.response.message || 'Failed to generate brainstorm')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Simulate progressive loading animation
  const simulateProgress = () => {
    let step = 0
    const interval = setInterval(() => {
      step++
      setCurrentStep(step)
      if (step >= 11) {
        clearInterval(interval)
      }
    }, 200)
  }

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Open refinement chat for specific step
  const openRefinementChat = (stepName: string) => {
    setChatOpen(true)
    setRefinementContext(stepName)
    setChatMessages([
      {
        role: 'assistant',
        content: `I can help you refine the ${stepName}. What would you like to improve or explore further?`,
        timestamp: new Date().toISOString()
      }
    ])
  }

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      // Use appropriate agent based on context
      const agentId = refinementContext.includes('Trends') || refinementContext.includes('Market')
        ? MARKET_RESEARCH_AGENT_ID
        : refinementContext.includes('Ideas') || refinementContext.includes('Hybrid')
        ? IDEATION_AGENT_ID
        : STRATEGY_AGENT_ID

      const result = await callAIAgent(
        `Refine ${refinementContext}: ${chatInput}. Context: Industry=${industry}, Problem=${problem}, Trend=${trend}`,
        agentId
      )

      if (result.success && result.response.status === 'success') {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: typeof result.response.result === 'string'
            ? result.response.result
            : JSON.stringify(result.response.result, null, 2),
          timestamp: new Date().toISOString()
        }
        setChatMessages(prev => [...prev, assistantMessage])
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setChatLoading(false)
    }
  }

  // Export functionality
  const exportAsMarkdown = () => {
    if (!response?.result) return

    const data = response.result as BrainstormResult
    let markdown = `# Product Innovation Brainstorm\n\n`
    markdown += `**Industry:** ${industry}\n`
    markdown += `**Problem:** ${problem}\n`
    markdown += `**Trend:** ${trend}\n\n`
    markdown += `---\n\n`

    // Add all sections
    markdown += `## Step 1: Emerging Trends\n\n`
    data.step1_trends?.forEach((t: TrendItem) => {
      markdown += `### ${t.trend} (Score: ${t.relevance_score})\n${t.description}\n\n`
    })

    markdown += `## Step 2: Pain Points\n\n`
    data.step2_pain_points?.forEach((p: PainPoint) => {
      markdown += `- **${p.pain_point}** (${p.severity})\n  - Impact: ${p.impact_area}\n  - Current: ${p.current_solutions}\n\n`
    })

    // Continue for other sections...

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brainstorm-${industry}-${Date.now()}.md`
    a.click()
  }

  const result = response?.result as BrainstormResult | undefined

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">Product Innovation Brainstorm Studio</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <>
                <Button variant="outline" size="sm" onClick={exportAsMarkdown}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-16 left-0 bottom-0 w-80 bg-gray-50 border-r border-gray-200 z-20 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sessions</h3>
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions yet</p>
              ) : (
                sessions.map(session => (
                  <Card key={session.id} className="cursor-pointer hover:bg-gray-100">
                    <CardContent className="p-3">
                      <div className="text-sm font-medium text-gray-900">{session.industry}</div>
                      <div className="text-xs text-gray-600 truncate">{session.problem}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Templates</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={() => {
                  setIndustry('Healthcare')
                  setProblem('Patient medication adherence')
                  setTrend('AI wearables')
                }}
              >
                Healthcare - AI Wearables
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={() => {
                  setIndustry('Fintech')
                  setProblem('Personal finance management')
                  setTrend('Open banking APIs')
                }}
              >
                Fintech - Open Banking
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={cn(
        "pt-20 pb-20 transition-all duration-300",
        sidebarOpen ? "pl-80" : "pl-0"
      )}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Input Configuration Bar */}
          <Card className="border-2 border-indigo-600 mb-6">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-coral-50">
              <CardTitle className="text-indigo-900">Start Your Innovation Journey</CardTitle>
              <CardDescription>Define your industry, problem, and emerging trend</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="industry" className="text-gray-700">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Healthcare, Fintech, EdTech"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="problem" className="text-gray-700">Problem Statement</Label>
                  <Input
                    id="problem"
                    placeholder="e.g., Patient medication adherence"
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="trend" className="text-gray-700">Emerging Trend</Label>
                  <Input
                    id="trend"
                    placeholder="e.g., AI wearables, Blockchain"
                    value={trend}
                    onChange={(e) => setTrend(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleStartBrainstorm}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Innovation Framework...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Start Brainstorm
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Indicator */}
          {(loading || result) && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Progress: {currentStep} of 11 Steps</h3>
                  <span className="text-sm text-gray-600">{Math.round((currentStep / 11) * 100)}% Complete</span>
                </div>
                <div className="relative">
                  <Progress value={(currentStep / 11) * 100} className="h-3 mb-4" />
                  <div className="grid grid-cols-11 gap-1">
                    {PROGRESS_STEPS.map(step => (
                      <div key={step.id} className="text-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-medium",
                          currentStep >= step.id
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        )}>
                          {step.id}
                        </div>
                        <div className="text-xs text-gray-600 hidden lg:block">{step.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Workspace */}
          {result && (
            <div className="space-y-6">
              {/* Step 1: Trends */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step1')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      <CardTitle>Step 1: Emerging Trends (10)</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 1: Trends')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step1'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step1'] && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.step1_trends?.map((trend, idx) => (
                        <Card key={idx} className="border-l-4 border-l-indigo-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-sm">{trend.trend}</h4>
                              <Badge variant="secondary" className="ml-2">{trend.relevance_score}</Badge>
                            </div>
                            <p className="text-xs text-gray-600">{trend.description}</p>
                            <ScoreBar score={trend.relevance_score} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 2: Pain Points */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step2')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <CardTitle>Step 2: Pain Points ({result.step2_pain_points?.length || 0})</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 2: Pain Points')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step2'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step2'] && (
                  <CardContent>
                    <div className="space-y-3">
                      {result.step2_pain_points?.map((point, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{point.pain_point}</h4>
                              <SeverityBadge severity={point.severity} />
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div><strong>Impact:</strong> {point.impact_area}</div>
                              <div><strong>Current Solutions:</strong> {point.current_solutions}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 3: Product Ideas */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step3')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      <CardTitle>Step 3: Product Ideas (10)</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 3: Product Ideas')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step3'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step3'] && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.step3_product_ideas?.map((idea, idx) => (
                        <Card key={idx} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="text-lg">{idea.idea_name}</CardTitle>
                            <CardDescription className="text-xs">
                              <Users className="h-3 w-3 inline mr-1" />
                              {idea.target_audience}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-700 mb-3">{idea.description}</p>
                            <div className="p-2 bg-indigo-50 rounded-md">
                              <p className="text-xs font-medium text-indigo-900">
                                <Target className="h-3 w-3 inline mr-1" />
                                {idea.key_value_prop}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 5: Top 3 Ideas */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step5')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle>Step 5: Top 3 Ideas Analysis</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 5: Top Ideas')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step5'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step5'] && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {result.step5_top_ideas?.map((idea, idx) => (
                        <Card key={idx} className="border-2 border-indigo-200">
                          <CardHeader className="bg-gradient-to-br from-indigo-50 to-white">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-indigo-600">Rank {idea.rank}</Badge>
                            </div>
                            <CardTitle className="text-lg mt-2">{idea.idea_name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <p className="text-sm text-gray-700 mb-4">{idea.description}</p>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Viability</span>
                                  <span className="font-medium">{idea.viability_score}</span>
                                </div>
                                <Progress value={idea.viability_score} className="h-2" />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Innovation</span>
                                  <span className="font-medium">{idea.innovation_score}</span>
                                </div>
                                <Progress value={idea.innovation_score} className="h-2" />
                              </div>
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Market Fit</span>
                                  <span className="font-medium">{idea.market_fit_score}</span>
                                </div>
                                <Progress value={idea.market_fit_score} className="h-2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 6: Unique Features */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step6')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <CardTitle>Step 6: Unique Features</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 6: Features')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step6'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step6'] && (
                  <CardContent>
                    <Tabs defaultValue={result.step6_unique_features?.[0]?.idea_name || ''}>
                      <TabsList className="mb-4">
                        {result.step6_unique_features?.map((item, idx) => (
                          <TabsTrigger key={idx} value={item.idea_name}>
                            {item.idea_name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {result.step6_unique_features?.map((item, idx) => (
                        <TabsContent key={idx} value={item.idea_name}>
                          <div className="space-y-3">
                            {item.features.map((feature, fIdx) => (
                              <Card key={fIdx}>
                                <CardContent className="p-4">
                                  <h4 className="font-semibold text-gray-900 mb-2">{feature.feature}</h4>
                                  <p className="text-sm text-gray-700 mb-2">{feature.description}</p>
                                  <div className="p-2 bg-green-50 rounded-md">
                                    <p className="text-xs text-green-900">
                                      <strong>Advantage:</strong> {feature.competitive_advantage}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                )}
              </Card>

              {/* Step 7: Obstacles */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step7')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <CardTitle>Step 7: Obstacles & Solutions</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 7: Obstacles')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step7'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step7'] && (
                  <CardContent>
                    <Tabs defaultValue={result.step7_obstacles?.[0]?.idea_name || ''}>
                      <TabsList className="mb-4">
                        {result.step7_obstacles?.map((item, idx) => (
                          <TabsTrigger key={idx} value={item.idea_name}>
                            {item.idea_name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {result.step7_obstacles?.map((item, idx) => (
                        <TabsContent key={idx} value={item.idea_name}>
                          <div className="space-y-3">
                            {item.obstacles.map((obstacle, oIdx) => (
                              <Card key={oIdx}>
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-gray-900">{obstacle.obstacle}</h4>
                                    <SeverityBadge severity={obstacle.severity} />
                                  </div>
                                  <div className="p-3 bg-blue-50 rounded-md">
                                    <p className="text-sm text-blue-900">
                                      <strong>Solution:</strong> {obstacle.proposed_solution}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                )}
              </Card>

              {/* Step 8: Hybrid Concepts */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step8')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <CardTitle>Step 8: Hybrid Concepts</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 8: Hybrid Concepts')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step8'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step8'] && (
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.step8_hybrid_concepts?.map((concept, idx) => (
                        <Card key={idx} className="border-2 border-purple-200">
                          <CardHeader className="bg-gradient-to-br from-purple-50 to-white">
                            <CardTitle className="text-lg">{concept.hybrid_name}</CardTitle>
                            <CardDescription>
                              <Badge variant="secondary" className="mr-1">Score: {concept.innovation_score}</Badge>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="mb-3">
                              <h5 className="text-xs font-semibold text-gray-600 mb-1">Parent Ideas:</h5>
                              <div className="flex flex-wrap gap-1">
                                {concept.parent_ideas.map((parent, pIdx) => (
                                  <Badge key={pIdx} variant="outline">{parent}</Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{concept.description}</p>
                            <div className="p-3 bg-purple-50 rounded-md">
                              <p className="text-xs text-purple-900">
                                <strong>Synergy:</strong> {concept.synergy_benefits}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 9: Scenarios */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step9')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <CardTitle>Step 9: User Scenarios</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 9: Scenarios')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step9'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step9'] && (
                  <CardContent>
                    <div className="space-y-4">
                      {result.step9_scenarios?.map((scenario, idx) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">{scenario.idea_name}</CardTitle>
                            <CardDescription>
                              <Users className="h-3 w-3 inline mr-1" />
                              {scenario.persona}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-700 italic">{scenario.scenario}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Step 10: Rankings */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step10')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <CardTitle>Step 10: Final Rankings</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 10: Rankings')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step10'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step10'] && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Idea Name</TableHead>
                          <TableHead className="text-right">Viability</TableHead>
                          <TableHead className="text-right">Innovation</TableHead>
                          <TableHead className="text-right">Market Fit</TableHead>
                          <TableHead className="text-right">Feasibility</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.step10_rankings?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge className={item.rank <= 3 ? "bg-green-600" : "bg-gray-600"}>
                                #{item.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.idea_name}</TableCell>
                            <TableCell className="text-right">{item.scores.viability}</TableCell>
                            <TableCell className="text-right">{item.scores.innovation}</TableCell>
                            <TableCell className="text-right">{item.scores.market_fit}</TableCell>
                            <TableCell className="text-right">{item.scores.feasibility}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{item.total_score}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{item.recommendation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>

              {/* Step 11: Roadmap */}
              <Card>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('step11')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      <CardTitle>Step 11: Implementation Roadmap</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRefinementChat('Step 11: Roadmap')
                        }}
                      >
                        Refine
                      </Button>
                      {collapsedSections['step11'] ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </div>
                  </div>
                </CardHeader>
                {!collapsedSections['step11'] && result.step11_roadmap && (
                  <CardContent>
                    <div className="relative">
                      {/* Timeline connector */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

                      <div className="space-y-8">
                        {/* Phase 1 */}
                        <div className="relative pl-20">
                          <div className="absolute left-0 top-2 w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                            <span className="text-indigo-700 font-bold">1</span>
                          </div>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Foundation</CardTitle>
                              <CardDescription>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {result.step11_roadmap.phase1_foundation.timeframe}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Activities:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {result.step11_roadmap.phase1_foundation.activities.map((activity, idx) => (
                                    <li key={idx}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Deliverables:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {result.step11_roadmap.phase1_foundation.deliverables.map((deliverable, idx) => (
                                    <Badge key={idx} variant="outline">{deliverable}</Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Phase 2 */}
                        <div className="relative pl-20">
                          <div className="absolute left-0 top-2 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                            <span className="text-blue-700 font-bold">2</span>
                          </div>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Development</CardTitle>
                              <CardDescription>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {result.step11_roadmap.phase2_development.timeframe}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Activities:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {result.step11_roadmap.phase2_development.activities.map((activity, idx) => (
                                    <li key={idx}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Deliverables:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {result.step11_roadmap.phase2_development.deliverables.map((deliverable, idx) => (
                                    <Badge key={idx} variant="outline">{deliverable}</Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Phase 3 */}
                        <div className="relative pl-20">
                          <div className="absolute left-0 top-2 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                            <span className="text-green-700 font-bold">3</span>
                          </div>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Launch</CardTitle>
                              <CardDescription>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {result.step11_roadmap.phase3_launch.timeframe}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Activities:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {result.step11_roadmap.phase3_launch.activities.map((activity, idx) => (
                                    <li key={idx}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Deliverables:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {result.step11_roadmap.phase3_launch.deliverables.map((deliverable, idx) => (
                                    <Badge key={idx} variant="outline">{deliverable}</Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Phase 4 */}
                        <div className="relative pl-20">
                          <div className="absolute left-0 top-2 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                            <span className="text-purple-700 font-bold">4</span>
                          </div>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Scale</CardTitle>
                              <CardDescription>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {result.step11_roadmap.phase4_scale.timeframe}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Activities:</h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {result.step11_roadmap.phase4_scale.activities.map((activity, idx) => (
                                    <li key={idx}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Deliverables:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {result.step11_roadmap.phase4_scale.deliverables.map((deliverable, idx) => (
                                    <Badge key={idx} variant="outline">{deliverable}</Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 w-96 bg-white border-l border-gray-200 z-40 transition-transform duration-300 shadow-xl",
          chatOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Refine Results</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg",
                    msg.role === 'user'
                      ? "bg-indigo-100 ml-8"
                      : "bg-gray-100 mr-8"
                  )}
                >
                  <p className="text-sm text-gray-900">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                placeholder="Ask to refine or explore..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
              />
              <Button
                size="icon"
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {result && !chatOpen && (
        <Button
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setChatOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}
