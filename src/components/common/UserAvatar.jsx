import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-20 w-20 text-2xl',
}

/**
 * Reusable avatar component that displays user photo or initials.
 *
 * Props:
 *   avatarUrl  - URL to the user's avatar image (optional)
 *   firstName  - User's first name (for initials fallback)
 *   lastName   - User's last name (for initials fallback)
 *   email      - User's email (fallback when no name)
 *   size       - 'sm' | 'md' | 'lg' (default: 'md')
 *   className  - Additional className
 */
export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  email,
  size = 'md',
  className,
}) {
  const initials =
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    '?'

  return (
    <Avatar className={cn(SIZES[size] || SIZES.md, className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={`${firstName || ''} ${lastName || ''}`.trim() || 'Avatar'} />}
      <AvatarFallback className={cn(SIZES[size] || SIZES.md)}>{initials}</AvatarFallback>
    </Avatar>
  )
}
