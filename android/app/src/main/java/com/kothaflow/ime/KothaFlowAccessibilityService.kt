package com.kothaflow.ime

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class KothaFlowAccessibilityService : AccessibilityService() {

    companion object {
        var instance: KothaFlowAccessibilityService? = null
            private set

        fun isRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Can be used to track current input fields if needed
    }

    override fun onInterrupt() {
        // Service interrupted
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Types or pastes text directly into whatever text box is currently active/focused
     * on the user's screen (e.g., Messenger, WhatsApp, Chrome, Notion, etc.).
     */
    fun insertTextIntoFocusedInput(textToInsert: String): Boolean {
        try {
            val root = rootInActiveWindow ?: return fallbackToClipboard(textToInsert)
            val focusedNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) 
                ?: findEditableNode(root)

            if (focusedNode != null) {
                // Check if node is editable
                val existingText = focusedNode.text?.toString() ?: ""
                val combinedText = if (existingText.isEmpty()) textToInsert else "$existingText $textToInsert"

                // Strategy 1: Direct ACTION_SET_TEXT
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, combinedText)
                }
                val success = focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                if (success) {
                    return true
                }

                // Strategy 2: Clipboard + ACTION_PASTE
                copyToClipboard(textToInsert)
                val pasteSuccess = focusedNode.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                if (pasteSuccess) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // Fallback: Copy to clipboard
        return fallbackToClipboard(textToInsert)
    }

    private fun findEditableNode(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isEditable && node.isFocused) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val result = findEditableNode(child)
            if (result != null) return result
        }
        return null
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("KothaFlow Voice Dictation", text)
        clipboard.setPrimaryClip(clip)
    }

    private fun fallbackToClipboard(text: String): Boolean {
        copyToClipboard(text)
        return false
    }
}
