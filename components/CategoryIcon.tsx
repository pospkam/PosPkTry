import { LucideIcon } from 'lucide-react'

interface CategoryIconProps {
  icon: LucideIcon
  color: string
}

export default function CategoryIcon({ icon: Icon, color }: CategoryIconProps) {
  return (
    <button className="flex items-center justify-center group">
      <div className={`${color} w-[70px] h-[70px] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95`}> 
        <Icon className="w-8 h-8 text-white" strokeWidth={2} />
      </div>
    </button>
  )
}