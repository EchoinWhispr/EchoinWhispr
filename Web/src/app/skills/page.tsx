'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Lightbulb, 
  Plus, 
  BookOpen, 
  GraduationCap, 
  X,
  Send,
  Check,
  Clock,
  User,
  ChevronRight
} from 'lucide-react';
import type { Id } from '@/lib/convex';

export default function SkillsPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ userId: Id<'users'>; skillName: string } | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  
  // Add skill form
  const [skillName, setSkillName] = useState('');
  const [skillType, setSkillType] = useState<'offering' | 'seeking'>('offering');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const mySkills = useQuery(api.skillExchange.getMySkills);
  const categories = useQuery(api.skillExchange.getCategories);
  const proficiencyLevels = useQuery(api.skillExchange.getProficiencyLevels);
  const offeredSkills = useQuery(api.skillExchange.browseOfferedSkills, { limit: 30 });
  const soughtSkills = useQuery(api.skillExchange.browseSoughtSkills, { limit: 30 });
  const incomingRequests = useQuery(api.skillExchange.getIncomingRequests);
  const outgoingRequests = useQuery(api.skillExchange.getOutgoingRequests);

  const addSkill = useMutation(api.skillExchange.addSkill);
  const removeSkill = useMutation(api.skillExchange.removeSkill);
  const requestExchange = useMutation(api.skillExchange.requestSkillExchange);
  const respondToRequest = useMutation(api.skillExchange.respondToSkillRequest);

  const handleAddSkill = async () => {
    if (!skillName.trim()) {
      toast({ title: "Enter a skill name", variant: "destructive" });
      return;
    }

    if (skillName.trim().length < 2 || skillName.trim().length > 50) {
      toast({
        title: "Invalid skill name length",
        description: "Skill name must be between 2 and 50 characters.",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length > 500) {
      toast({
        title: "Description too long",
        description: "Description must be 500 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      await addSkill({
        skillName: skillName.trim(),
        type: skillType,
        category: category || undefined,
        description: description || undefined,
        proficiencyLevel: proficiency || undefined,
      });

      toast({
        title: "Skill added! 🎉",
        description: `Now ${skillType === 'offering' ? 'teaching' : 'learning'}: ${skillName}`,
      });

      setShowAddDialog(false);
      resetForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to add",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSkill = async (skillId: Id<'skills'>) => {
    try {
      await removeSkill({ skillId });
      toast({ title: "Skill removed" });
    } catch (error) {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const handleRequestLearn = async () => {
    if (!selectedTeacher) return;

    try {
      await requestExchange({
        teacherId: selectedTeacher.userId,
        skillName: selectedTeacher.skillName,
        message: requestMessage || undefined,
      });

      toast({
        title: "Request sent! 📬",
        description: "They'll be notified of your interest.",
      });

      setShowRequestDialog(false);
      setSelectedTeacher(null);
      setRequestMessage('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to send request",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRespondToRequest = async (matchId: Id<'skillMatches'>, accept: boolean) => {
    try {
      await respondToRequest({ matchId, accept });
      toast({
        title: accept ? "Request accepted! 🤝" : "Request declined",
        description: accept ? "You can now start the skill exchange!" : "",
      });
    } catch (error) {
      toast({ title: "Failed to respond", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSkillName('');
    setSkillType('offering');
    setCategory('');
    setDescription('');
    setProficiency('');
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="glass p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 rounded-xl">
                <Lightbulb className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gradient">
                  Skill Exchange
                </h1>
                <p className="text-muted-foreground">
                  Learn from others, share what you know
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Skill
            </Button>
          </div>
        </header>

        {/* My Skills */}
        <Card className="glass border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            My Skills
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Offering */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2 text-green-400">
                <GraduationCap className="w-4 h-4" />
                I Can Teach
              </h3>
              {mySkills?.offering?.length === 0 && (
                <p className="text-sm text-muted-foreground">No teaching skills yet</p>
              )}
              {mySkills?.offering?.map((skill) => (
                <div 
                  key={skill._id}
                  className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg"
                >
                  <span className="text-sm capitalize">{skill.skillName}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleRemoveSkill(skill._id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Seeking */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2 text-blue-400">
                <BookOpen className="w-4 h-4" />
                I Want to Learn
              </h3>
              {mySkills?.seeking?.length === 0 && (
                <p className="text-sm text-muted-foreground">No learning goals yet</p>
              )}
              {mySkills?.seeking?.map((skill) => (
                <div 
                  key={skill._id}
                  className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg"
                >
                  <span className="text-sm capitalize">{skill.skillName}</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveSkill(skill._id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Requests */}
        {((incomingRequests?.length ?? 0) > 0 || (outgoingRequests?.filter(r => r.status === 'pending').length ?? 0) > 0) && (
          <Card className="glass border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Exchange Requests
            </h2>

            {/* Incoming */}
            {incomingRequests?.filter(r => r.status === 'pending').map((req) => (
              <div 
                key={req._id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg mb-2"
              >
                <div>
                  <p className="text-sm font-medium capitalize">
                    Someone wants to learn: {req.skillName}
                  </p>
                    {req.requestMessage && (
                      <p className="text-xs text-muted-foreground mt-1">
                        &quot;{req.requestMessage}&quot;
                      </p>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRespondToRequest(req._id, false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleRespondToRequest(req._id, true)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Outgoing Pending */}
            {outgoingRequests?.filter(r => r.status === 'pending').map((req) => (
              <div 
                key={req._id}
                className="p-3 bg-amber-500/10 rounded-lg mb-2"
              >
                <p className="text-sm capitalize">
                  Request pending: {req.skillName}
                </p>
                <Badge className="mt-1 bg-amber-500/20 text-amber-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Awaiting response
                </Badge>
              </div>
            ))}
          </Card>
        )}

        {/* Browse Skills */}
        <Tabs defaultValue="offered" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger 
              value="offered"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Skills Offered
            </TabsTrigger>
            <TabsTrigger 
              value="sought"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Skills Wanted
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offered" className="space-y-3">
            {offeredSkills?.map((skill) => (
              <Card 
                key={skill.skillName}
                className="glass border-white/10 p-4 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => {
                  if (!skill.userOffering && skill.sample?.userId) {
                    setSelectedTeacher({
                      userId: skill.sample.userId as Id<'users'>,
                      skillName: skill.skillName,
                    });
                    setShowRequestDialog(true);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium capitalize">{skill.skillName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {skill.count} {skill.count === 1 ? 'teacher' : 'teachers'}
                      </Badge>
                      {skill.category && (
                        <Badge className="text-xs bg-amber-500/20 text-amber-300">
                          {categories?.find(c => c.id === skill.category)?.icon} {skill.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!skill.userOffering && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  {skill.userOffering && (
                    <Badge className="bg-green-500/20 text-green-300">
                      You teach this
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sought" className="space-y-3">
            {soughtSkills?.map((skill) => (
              <Card 
                key={skill.skillName}
                className="glass border-white/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium capitalize">{skill.skillName}</h3>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {skill.count} {skill.count === 1 ? 'learner' : 'learners'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add Skill Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                Add a Skill
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button
                  variant={skillType === 'offering' ? 'default' : 'outline'}
                  onClick={() => setSkillType('offering')}
                  className="flex-1"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  I can teach
                </Button>
                <Button
                  variant={skillType === 'seeking' ? 'default' : 'outline'}
                  onClick={() => setSkillType('seeking')}
                  className="flex-1"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  I want to learn
                </Button>
              </div>

              <div>
                <Label>Skill Name</Label>
                <Input
                  placeholder="e.g., Python, Guitar, Spanish"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                />
              </div>

              <div>
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories?.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={category === cat.id ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                    >
                      {cat.icon} {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {skillType === 'offering' && (
                <div>
                  <Label>Proficiency Level</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {proficiencyLevels?.map((level) => (
                      <Badge
                        key={level.id}
                        variant={proficiency === level.id ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => setProficiency(proficiency === level.id ? '' : level.id)}
                      >
                        {level.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Tell us more about what you can teach or want to learn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddSkill}
                disabled={isAdding}
                className="bg-gradient-to-r from-amber-600 to-orange-600"
              >
                {isAdding ? "Adding..." : "Add Skill"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Learn Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request to Learn</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-muted-foreground">
                Send a request to learn <strong className="capitalize text-foreground">{selectedTeacher?.skillName}</strong> from this teacher.
              </p>
              
              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="Introduce yourself and explain why you want to learn..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestLearn}>
                <Send className="w-4 h-4 mr-2" />
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
