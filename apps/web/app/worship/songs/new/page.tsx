import { SongForm } from '@/modules/worship-slides/components/SongForm'
export default function NewSong() {
  return (<div className="space-y-6"><h1 className="text-2xl font-semibold">新建歌曲</h1><SongForm mode="create" /></div>)
}
