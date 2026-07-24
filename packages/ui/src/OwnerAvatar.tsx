interface OwnerAvatarProps {
  name: string;
  color: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export function OwnerAvatar({ name, color, size = 24 }: OwnerAvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.42);

  return (
    <div
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize,
        lineHeight: 1,
      }}
      title={name}
    >
      <span className="font-medium text-white leading-none select-none">
        {initials}
      </span>
    </div>
  );
}
