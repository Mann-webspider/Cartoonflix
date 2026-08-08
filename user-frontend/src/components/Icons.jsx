/**
 * One icon set, drawn here rather than pulled from a library, so stroke weight
 * and corner language match the rest of the surface. Strokes are 1.75 at 24px
 * and use round caps; solid marks (play) carry no stroke.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Svg = ({ children, size = 20, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const PlayIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M8 5.6v12.8a.8.8 0 0 0 1.22.68l10.2-6.4a.8.8 0 0 0 0-1.36L9.22 4.92A.8.8 0 0 0 8 5.6Z" fill="currentColor" />
  </Svg>
);

export const PlusIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M12 5v14M5 12h14" {...stroke} />
  </Svg>
);

export const CheckIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="m4.5 12.5 5 5 10-11" {...stroke} />
  </Svg>
);

export const SearchIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <circle cx="11" cy="11" r="6.25" {...stroke} />
    <path d="m15.6 15.6 3.9 3.9" {...stroke} />
  </Svg>
);

export const ChevronLeftIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M14.5 5 8 12l6.5 7" {...stroke} />
  </Svg>
);

export const ChevronRightIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M9.5 5 16 12l-6.5 7" {...stroke} />
  </Svg>
);

export const UserIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <circle cx="12" cy="8.5" r="3.75" {...stroke} />
    <path d="M4.75 19.25a7.25 7.25 0 0 1 14.5 0" {...stroke} />
  </Svg>
);

export const PauseIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" fill="currentColor" />
  </Svg>
);

export const VolumeIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M4.75 9.25h3L12 5.75v12.5L7.75 14.75h-3z" {...stroke} />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" {...stroke} />
  </Svg>
);

export const MuteIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M4.75 9.25h3L12 5.75v12.5L7.75 14.75h-3z" {...stroke} />
    <path d="m16 10 4 4M20 10l-4 4" {...stroke} />
  </Svg>
);

export const FullscreenIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M9 4.75H4.75V9M15 4.75h4.25V9M9 19.25H4.75V15M15 19.25h4.25V15" {...stroke} />
  </Svg>
);

export const ExitFullscreenIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M4.75 9H9V4.75M19.25 9H15V4.75M4.75 15H9v4.25M19.25 15H15v4.25" {...stroke} />
  </Svg>
);

export const HeartIcon = ({ size = 20, filled = false, ...rest }) => (
  <Svg size={size} {...rest}>
    <path
      d="M12 19.5S4.75 15.1 4.75 10.1A3.85 3.85 0 0 1 12 8.2a3.85 3.85 0 0 1 7.25 1.9c0 5-7.25 9.4-7.25 9.4Z"
      {...stroke}
      fill={filled ? "currentColor" : "none"}
    />
  </Svg>
);

export const ShareIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="M12 15.5V4.25M8.25 7.5 12 3.75l3.75 3.75" {...stroke} />
    <path d="M5.75 13.5v4.75a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5V13.5" {...stroke} />
  </Svg>
);

export const StarIcon = ({ size = 20, filled = false, ...rest }) => (
  <Svg size={size} {...rest}>
    <path
      d="m12 4.5 2.29 4.64 5.12.75-3.7 3.61.87 5.1L12 16.19l-4.58 2.41.87-5.1-3.7-3.61 5.12-.75z"
      {...stroke}
      fill={filled ? "currentColor" : "none"}
    />
  </Svg>
);

export const CloseIcon = ({ size = 20, ...rest }) => (
  <Svg size={size} {...rest}>
    <path d="m6 6 12 12M18 6 6 18" {...stroke} />
  </Svg>
);
