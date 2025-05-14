import type {Emoji} from '@assets/emojis/types';

type EmojiPickerMenuProps = {
    /** Function to add the selected emoji to the main compose text input */
    onEmojiSelected: (emoji: string, emojiObject: Emoji) => void;
    onMenuInputFocusChange: (isFocused: boolean) => void;
    activeEmoji?: string;
};

export default EmojiPickerMenuProps;
