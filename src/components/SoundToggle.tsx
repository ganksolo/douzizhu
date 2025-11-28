import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { soundManager } from '../utils/sound';

export function SoundToggle() {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Check if sound is ready
        const checkReady = setInterval(() => {
            if (soundManager.isReady()) {
                setIsReady(true);
                clearInterval(checkReady);
            }
        }, 100);

        return () => clearInterval(checkReady);
    }, []);

    const handleClick = async () => {
        // Initialize sound on first click if not ready
        if (!isReady) {
            await soundManager.initialize();
            setIsReady(true);
        }

        const newState = !soundEnabled;
        setSoundEnabled(newState);
        soundManager.toggle(newState);

        // Play a test sound if enabling
        if (newState) {
            soundManager.play('click');
        }
    };

    return (
        <motion.button
            onClick={handleClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
            {soundEnabled ? (
                <Volume2 className="w-6 h-6" />
            ) : (
                <VolumeX className="w-6 h-6" />
            )}
            {!isReady && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            )}
        </motion.button>
    );
}
