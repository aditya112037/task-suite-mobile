import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/services/auth-context";
import { approveJoinRequest, createTeam, getMyJoinRequests, getTeams, rejectJoinRequest, retractJoinRequest, type JoinRequestNotice, type TeamSummary } from "@/services/teams";

const C = { white:"#FFFFFF", ink:"#18232D", muted:"#6F7A83", teal:"#087F73", dark:"#08796F", mint:"#E1F5F1", border:"#E4E8E6", pale:"#F2F8F6" };
type Tab = "mine" | "join";
type Requests = { pending: JoinRequestNotice[]; rejected: JoinRequestNotice[] };

function Primary({ label, onPress, icon = "+", disabled = false }: { label:string; onPress:()=>void; icon?:string; disabled?:boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.primary, disabled && {opacity:.5}]}><ThemedText style={s.primaryIcon}>{icon}</ThemedText><ThemedText style={s.primaryText}>{label}</ThemedText></Pressable>;
}
function Outline({ label, onPress, icon }: { label:string; onPress:()=>void; icon:string }) {
  return <Pressable onPress={onPress} style={s.outline}><ThemedText style={s.outlineIcon}>{icon}</ThemedText><ThemedText style={s.outlineText}>{label}</ThemedText></Pressable>;
}

export default function TeamsScreen() {
  const { user } = useAuth() as { user?: { id?: string } | null };
  const [tab,setTab] = useState<Tab>("mine");
  const [teams,setTeams] = useState<TeamSummary[]>([]);
  const [requests,setRequests] = useState<Requests>({pending:[],rejected:[]});
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [working,setWorking] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [createOpen,setCreateOpen] = useState(false);
  const [joinOpen,setJoinOpen] = useState(false);
  const [requestsOpen,setRequestsOpen] = useState(false);
  const [name,setName] = useState("");
  const [description,setDescription] = useState("");
  const [code,setCode] = useState("");

  const load = useCallback(async (refresh=false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const [t,r] = await Promise.all([
        getTeams(user?.id || "").catch(()=>[] as TeamSummary[]),
        getMyJoinRequests().catch(()=>({pending:[],rejected:[]}) as Requests),
      ]);
      setTeams(t); setRequests(r); setError(null);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load teams"); }
    finally { setLoading(false); setRefreshing(false); }
  },[user?.id]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);

  async function makeTeam() {
    if(!name.trim()){Alert.alert("Team name required","Enter a name for your workspace.");return;}
    setWorking(true);
    try { await createTeam({name:name.trim(),description:description.trim()||undefined});setCreateOpen(false);setName("");setDescription("");await load(true);setTab("mine"); }
    catch(e){Alert.alert("Could not create team",e instanceof Error?e.message:"Please try again.");}
    finally{setWorking(false);}
  }
  function joinByCode() {
    if(!code.trim()){Alert.alert("Invite code required","Enter the code shared by the team owner.");return;}
    Alert.alert("Backend endpoint required","The provided mobile service only supports joining by team ID, not resolving an invite code. Add a backend endpoint that accepts the invite code to enable this operation.");
  }
  async function requestAction(action:"approve"|"reject"|"withdraw", teamId:string, userId?:string) {
    setWorking(true);
    try {
      if(action==="approve" && userId) await approveJoinRequest(teamId,userId);
      else if(action==="reject" && userId) await rejectJoinRequest(teamId,userId);
      else await retractJoinRequest(teamId);
      await load(true);
    } catch(e){Alert.alert("Request failed",e instanceof Error?e.message:"Please try again.");}
    finally{setWorking(false);}
  }

  return <ScreenShell refreshing={refreshing} onRefresh={()=>load(true)}>
    <View style={s.container}>
      <View style={s.header}>
        <ThemedText style={s.title}>Teams</ThemedText>
        <ThemedText style={s.subtitle}>Manage your teams and collaborate</ThemedText>
        <View style={s.pill}><ThemedText style={s.people}>♟</ThemedText><ThemedText style={s.pillText}>{teams.length} {teams.length===1?"workspace":"workspaces"}</ThemedText></View>
      </View>
      <View style={s.segment}>
        <Pressable onPress={()=>setTab("mine")} style={[s.segmentItem,tab==="mine"&&s.segmentActive]}><ThemedText style={[s.segmentText,tab==="mine"&&s.segmentTextActive]}>My teams</ThemedText></Pressable>
        <Pressable onPress={()=>setTab("join")} style={[s.segmentItem,tab==="join"&&s.segmentActive]}><ThemedText style={[s.segmentText,tab==="join"&&s.segmentTextActive]}>Join a team</ThemedText></Pressable>
      </View>
      {loading ? <View style={s.loading}><ActivityIndicator size="large" color={C.teal}/><ThemedText style={s.muted}>Loading your workspaces…</ThemedText></View> :
       error ? <View style={s.empty}><ThemedText style={s.emptyTitle}>Couldn't load teams</ThemedText><ThemedText style={s.muted}>{error}</ThemedText><Outline label="Try again" icon="↻" onPress={()=>load()}/></View> :
       tab==="mine" && teams.length===0 ? <View style={s.empty}>
         <View style={s.illustration}><View style={s.personL}/><View style={s.personR}/><View style={s.personC}/><View style={s.spark}/></View>
         <ThemedText style={s.emptyTitle}>Your team space starts here</ThemedText>
         <ThemedText style={s.emptyDescription}>Create a workspace for your projects or{"\n"}join one with an invite code.</ThemedText>
         <Primary label="Create new team" onPress={()=>setCreateOpen(true)}/>
         <Outline label="Join with invite code" icon="↗" onPress={()=>setJoinOpen(true)}/>
         <Pressable style={s.requestRow} onPress={()=>setRequestsOpen(true)}><View style={s.requestIcon}><ThemedText style={s.requestGlyph}>▤</ThemedText></View><ThemedText style={s.requestTitle}>My join requests</ThemedText>{requests.pending.length+requests.rejected.length>0?<ThemedText style={s.count}>{requests.pending.length+requests.rejected.length}</ThemedText>:null}<ThemedText style={s.chevron}>›</ThemedText></Pressable>
       </View> :
       tab==="mine" ? <View style={s.list}>
         {teams.map(team=><Pressable key={team.id} style={s.team} onPress={()=>router.push({pathname:"/team/[teamId]",params:{teamId:team.id}})}><View style={[s.teamIcon,{backgroundColor:team.color||C.mint}]}><ThemedText style={s.teamInitial}>{team.name?.[0]?.toUpperCase()||"T"}</ThemedText></View><View style={{flex:1,gap:4}}><ThemedText style={s.teamName}>{team.name}</ThemedText><ThemedText style={s.muted}>{team.description||"Open workspace and collaborate with your team"}</ThemedText></View><ThemedText style={s.chevron}>›</ThemedText></Pressable>)}
         <Primary label="Create new team" onPress={()=>setCreateOpen(true)}/><Outline label="Join with invite code" icon="↗" onPress={()=>setJoinOpen(true)}/><Pressable style={s.requestRow} onPress={()=>setRequestsOpen(true)}><View style={s.requestIcon}><ThemedText style={s.requestGlyph}>▤</ThemedText></View><ThemedText style={s.requestTitle}>My join requests</ThemedText><ThemedText style={s.chevron}>›</ThemedText></Pressable>
       </View> :
       <View style={s.empty}><View style={s.joinIcon}><ThemedText style={s.joinGlyph}>↗</ThemedText></View><ThemedText style={s.emptyTitle}>Find your team</ThemedText><ThemedText style={s.emptyDescription}>Have an invite code? Use it to request access to a workspace.</ThemedText><Primary label="Join with invite code" icon="↗" onPress={()=>setJoinOpen(true)}/><Outline label="My join requests" icon="▤" onPress={()=>setRequestsOpen(true)}/></View>}
      <View style={s.footer}><ThemedText style={{color:"#69928C"}}>♟</ThemedText><ThemedText style={s.muted}>You can collaborate with teammates anytime.</ThemedText></View>
    </View>

    <Modal transparent visible={createOpen} animationType="fade" onRequestClose={()=>setCreateOpen(false)}><View style={s.shade}><View style={s.modal}>
      <ThemedText style={s.modalTitle}>Create new team</ThemedText><ThemedText style={s.muted}>Set up a workspace for your project or team.</ThemedText>
      <TextInput value={name} onChangeText={setName} placeholder="Team name" placeholderTextColor="#929B9B" style={s.input} maxLength={70}/>
      <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor="#929B9B" style={[s.input,{minHeight:75,textAlignVertical:"top"}]} multiline/>
      <Primary label={working?"Creating…":"Create team"} onPress={makeTeam} disabled={working}/><Pressable onPress={()=>setCreateOpen(false)} style={s.cancel}><ThemedText style={s.muted}>Cancel</ThemedText></Pressable>
    </View></View></Modal>
    <Modal transparent visible={joinOpen} animationType="fade" onRequestClose={()=>setJoinOpen(false)}><View style={s.shade}><View style={s.modal}>
      <ThemedText style={s.modalTitle}>Join with invite code</ThemedText><ThemedText style={s.muted}>Enter the code shared by the team owner.</ThemedText>
      <TextInput value={code} onChangeText={setCode} placeholder="Invite code" placeholderTextColor="#929B9B" style={s.input} autoCapitalize="characters"/>
      <Primary label="Continue" icon="↗" onPress={joinByCode}/><Pressable onPress={()=>setJoinOpen(false)} style={s.cancel}><ThemedText style={s.muted}>Cancel</ThemedText></Pressable>
    </View></View></Modal>
    <Modal transparent visible={requestsOpen} animationType="slide" onRequestClose={()=>setRequestsOpen(false)}><View style={s.shade}><View style={[s.modal,{maxHeight:"80%"}]}>
      <View style={s.modalHeader}><ThemedText style={s.modalTitle}>My join requests</ThemedText><Pressable onPress={()=>setRequestsOpen(false)}><ThemedText style={s.chevron}>✕</ThemedText></Pressable></View>
      <ScrollView contentContainerStyle={{gap:10}}>
        {requests.pending.length===0&&requests.rejected.length===0?<ThemedText style={s.muted}>You don't have any join requests yet.</ThemedText>:null}
        {requests.pending.map((item,index)=>{const x=item as any;const teamId=String(x.teamId||x.team?.id||x.id||"");const userId=String(x.userId||x.requesterId||"");return <View key={String(x.id||index)} style={s.requestItem}><View style={{flex:1}}><ThemedText style={s.teamName}>{x.teamName||x.team?.name||"Join request"}</ThemedText><ThemedText style={s.muted}>Pending</ThemedText></View>{userId?<><Pressable onPress={()=>requestAction("approve",teamId,userId)}><ThemedText style={s.action}>Approve</ThemedText></Pressable><Pressable onPress={()=>requestAction("reject",teamId,userId)}><ThemedText style={s.reject}>Reject</ThemedText></Pressable></>:<Pressable onPress={()=>requestAction("withdraw",teamId)}><ThemedText style={s.reject}>Withdraw</ThemedText></Pressable>}</View>})}
        {requests.rejected.map((item,index)=><View key={String((item as any).id||index)} style={s.requestItem}><View style={{flex:1}}><ThemedText style={s.teamName}>{(item as any).teamName||(item as any).team?.name||"Join request"}</ThemedText><ThemedText style={s.muted}>Rejected</ThemedText></View></View>)}
      </ScrollView><Outline label="Refresh requests" icon="↻" onPress={()=>load(true)}/>
    </View></View></Modal>
  </ScreenShell>;
}

const s=StyleSheet.create({
 container:{gap:18,paddingHorizontal:3,paddingBottom:32},
 header:{paddingTop:10,paddingHorizontal:2,gap:3,marginBottom:10},
 title:{fontSize:38,lineHeight:46,color:C.ink,fontWeight:"800",letterSpacing:-.7},
 subtitle:{color:C.muted,fontSize:16},
 pill:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:8,backgroundColor:C.mint,borderRadius:22,paddingHorizontal:14,paddingVertical:8,marginTop:9},
 people:{color:C.teal,fontSize:20},pillText:{color:C.ink,fontSize:14,fontWeight:"700"},
 segment:{flexDirection:"row",padding:3,borderRadius:22,backgroundColor:C.white,borderWidth:1,borderColor:"#D9DEDC",minHeight:55,marginHorizontal:18,marginBottom:10},
 segmentItem:{flex:1,alignItems:"center",justifyContent:"center",borderRadius:19},segmentActive:{backgroundColor:C.teal,elevation:2},
 segmentText:{color:"#68727B",fontSize:15,fontWeight:"600"},segmentTextActive:{color:C.white,fontWeight:"800"},
 loading:{paddingVertical:48,alignItems:"center",gap:12},muted:{color:C.muted,fontSize:12,lineHeight:18},
 empty:{backgroundColor:C.white,borderRadius:25,paddingHorizontal:20,paddingTop:28,paddingBottom:20,borderWidth:1,borderColor:"#EEF0ED",alignItems:"center",gap:14},
 illustration:{width:210,height:145,borderRadius:80,backgroundColor:"#F0FAF7",alignItems:"center",justifyContent:"center",marginBottom:2,overflow:"hidden"},
 personC:{position:"absolute",bottom:25,width:63,height:63,borderRadius:32,backgroundColor:C.teal},personL:{position:"absolute",bottom:30,left:25,width:34,height:42,borderRadius:20,backgroundColor:C.teal},personR:{position:"absolute",bottom:30,right:25,width:34,height:42,borderRadius:20,backgroundColor:C.teal},spark:{position:"absolute",top:18,width:5,height:18,borderRadius:5,backgroundColor:C.teal},
 emptyTitle:{color:C.ink,fontSize:22,lineHeight:28,fontWeight:"800",textAlign:"center"},emptyDescription:{color:C.muted,fontSize:15,lineHeight:22,textAlign:"center",marginBottom:8},
 primary:{width:"100%",minHeight:54,borderRadius:20,backgroundColor:C.dark,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12,paddingHorizontal:16},primaryIcon:{color:C.white,fontSize:25,lineHeight:27},primaryText:{color:C.white,fontSize:15,fontWeight:"800"},
 outline:{width:"100%",minHeight:54,borderRadius:20,backgroundColor:C.white,borderWidth:1.3,borderColor:C.teal,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:12,paddingHorizontal:16},outlineIcon:{color:C.teal,fontSize:22,fontWeight:"700"},outlineText:{color:C.ink,fontSize:15,fontWeight:"700"},
 requestRow:{width:"100%",minHeight:60,borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:"#FCFCFB",flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:10,marginTop:5},requestIcon:{width:43,height:43,borderRadius:22,backgroundColor:C.pale,alignItems:"center",justifyContent:"center"},requestGlyph:{color:C.teal,fontSize:24,fontWeight:"700"},requestTitle:{flex:1,color:C.ink,fontSize:15,fontWeight:"600"},count:{color:C.teal,fontWeight:"800"},chevron:{color:"#68727B",fontSize:25,paddingHorizontal:3},
 list:{gap:12},team:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:20,padding:14,flexDirection:"row",alignItems:"center",gap:12},teamIcon:{width:48,height:48,borderRadius:16,alignItems:"center",justifyContent:"center"},teamInitial:{color:C.teal,fontSize:21,fontWeight:"800"},teamName:{color:C.ink,fontSize:15,fontWeight:"800"},
 footer:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:4},joinIcon:{width:88,height:88,borderRadius:44,backgroundColor:C.mint,alignItems:"center",justifyContent:"center"},joinGlyph:{color:C.teal,fontSize:44,fontWeight:"700"},
 shade:{flex:1,backgroundColor:"rgba(15,28,27,.42)",justifyContent:"center",padding:22},modal:{backgroundColor:C.white,borderRadius:24,padding:22,gap:14},modalTitle:{color:C.ink,fontSize:21,fontWeight:"800"},input:{borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:14,paddingVertical:13,color:C.ink,fontSize:15,backgroundColor:"#FCFDFC"},cancel:{alignItems:"center",padding:10},modalHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},requestItem:{flexDirection:"row",alignItems:"center",gap:10,padding:12,borderWidth:1,borderColor:C.border,borderRadius:14},action:{color:C.teal,fontSize:11,fontWeight:"800"},reject:{color:"#B54747",fontSize:11,fontWeight:"700"}
});

