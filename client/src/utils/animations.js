export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 }
  }
};

export const slideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const cardHover = {
  rest: { scale: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  hover: {
    scale: 1.02,
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    transition: { duration: 0.2 }
  }
};

export const buttonTap = {
  tap: { scale: 0.96 }
};

export const pulseOrange = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(255,107,53,0.4)',
      '0 0 0 15px rgba(255,107,53,0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeOut'
    }
  }
};

export const spinnerVariant = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: 'linear' }
  }
};

export const newRequestSlide = {
  hidden: { opacity: 0, x: -100, height: 0 },
  visible: {
    opacity: 1, x: 0, height: 'auto',
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: {
    opacity: 0, x: 100, height: 0,
    transition: { duration: 0.3 }
  }
};
