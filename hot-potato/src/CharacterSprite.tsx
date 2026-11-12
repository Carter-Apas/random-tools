import type { Avatar } from "../shared/types";

export type CharacterPose = "idle" | "hold" | "charred" | "down";

export const CharacterSprite = ({
  avatar,
  pose = "idle",
  label,
}: {
  avatar: Avatar;
  pose?: CharacterPose;
  label?: string;
}) => (
  <span
    className={`character character-${avatar} figure-${pose}`}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <img
      className="character-sheet"
      src={`/assets/${avatar}-${pose}.png`}
      alt=""
      draggable={false}
    />
  </span>
);
