import {authenticateDevice,db,errorResponse,json} from '../../../../lib/db';
import {decodeResultTheme} from '../../../../lib/resultTheme';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const identity=await authenticateDevice(request); if(!identity)return json({error:'Connect your profile to view this result.'},401);
  const row=await db().prepare(`SELECT a.*,p.handle,c.slug AS challenge_slug,c.title,c.language,c.passage,c.attribution FROM challenge_attempts a JOIN profiles p ON p.id=a.profile_id JOIN challenges c ON c.id=a.challenge_id WHERE a.id=? AND a.profile_id=?`).bind((await params).id,identity.profileId).first<{slug:string;title:string;handle:string;language:string;duration_ms:number;wpm:number;raw_wpm:number;accuracy:number;errors:number;challenge_slug:string;passage:string;progress_json:string;attribution:string;created_at:number;theme_json:string}>();
  if(!row)return json({error:'Result not found in this profile.'},404);
  return json({result:{url:`https://typearchy.com/a/${row.slug}`,title:row.title,handle:row.handle,category:row.language,durationMs:row.duration_ms,wpm:row.wpm,rawWpm:row.raw_wpm,accuracy:row.accuracy,errors:row.errors,challengeUrl:`/c/${row.challenge_slug}`,passage:row.passage,progress:JSON.parse(row.progress_json),source:row.attribution,createdAt:row.created_at,theme:decodeResultTheme(row.theme_json),validated:true}});
 }catch(error){return errorResponse(error);}
}
