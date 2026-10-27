// The Liftshare icon (the "L" with its riders and road) - no wordmark.
//
// Drawn as inline SVG so its colours can follow the theme through CSS
// variables (see index.css): in the dark theme the tile is the page background
// colour so only the mark shows; in the light theme the tile and road are
// black. Keep in sync with public/favicon.svg and the generated app icons
// (C:\work\_logo\build-logo.cjs shares the same geometry).
export const LOGO_VIEWBOX = "270 150 730 690";

export default function LiftshareMark({ size = 38, className, title = "Liftshare" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <rect x="270" y="150" width="730" height="690" rx="150" style={{ fill: "var(--logo-tile, #0B0F17)" }} />
      <path
        style={{ fill: "var(--logo-road, #1C2A44)" }}
        d="M465 799L735 799C736 780 740 760 745 735C755 685 790 628 840 590C880 560 920 546 950 542C900 546 850 556 800 570C740 590 690 618 650 642C600 674 565 705 525 740C500 765 480 785 465 799Z"
      />
      <g fill="#fff">
        <path d="M314 290C314 235 352 185 398 185C432 185 454 208 454 242L454 590C454 618 470 640 498 632C560 612 650 575 720 556C800 536 880 534 950 542C900 546 850 556 800 570C740 590 690 618 650 642C600 674 565 705 525 740C500 765 480 785 465 799L440 800C370 800 314 750 314 660Z" />
        <path d="M950 542C920 546 880 560 840 590C790 628 755 685 745 735C740 760 736 780 735 799L840 799C860 799 874 785 872 765C868 742 850 725 830 708C812 692 810 665 818 640C830 600 870 565 950 542Z" />
        <path d="M615 744L649 693L677 693L650 744Z" />
        <path d="M680 661L715 629L737 629L706 661Z" />
        <path d="M750 606L783 584L800 585L769 607Z" />
        <path d="M820 572L843 561L852 561L832 572Z" />
        <circle cx="682" cy="361" r="61" />
        <path d="M570 540C575 480 625 438 682 438C740 438 778 478 782 508C740 500 690 508 640 520C610 527 588 532 570 540Z" />
      </g>
      <g fill="#38BDF8">
        <circle cx="543" cy="398" r="45" />
        <path d="M470 520C470 485 505 456 545 456C560 456 570 459 576 463C560 485 552 510 550 552C530 560 512 568 500 570C480 568 470 548 470 520Z" />
      </g>
      <g fill="#34D399">
        <circle cx="820" cy="397" r="45" />
        <path d="M783 468C800 458 830 455 850 458C875 462 892 485 892 512C870 514 840 513 805 509C800 495 792 480 783 468Z" />
      </g>
    </svg>
  );
}
