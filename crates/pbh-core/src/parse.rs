//! Extract EVE character names from text pasted out of the client.
//!
//! Two paste shapes are supported:
//!
//! 1. **Member-list copy** (right-click the local member list → "Copy"): one
//!    character name per line, nothing else.
//! 2. **Chat-log copy** (select lines in the chat window → Ctrl+C): each line
//!    looks like `[ 2026.06.02 17:00:00 ] Pilot Name > message text`.
//!
//! We tolerate a mix of both, blank lines, and stray whitespace, and we
//! de-duplicate while preserving first-seen order.

use std::collections::HashSet;

/// EVE character names are 3–37 characters. They allow letters, digits, single
/// spaces between the (up to three) name parts, hyphens and apostrophes.
const NAME_MIN: usize = 3;
const NAME_MAX: usize = 37;

/// Parse a pasted blob into a de-duplicated, order-preserving list of candidate
/// character names.
pub fn parse_local(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for raw_line in text.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        let candidate = strip_chat_prefix(line).unwrap_or(line);
        let name = candidate.trim();

        if !is_plausible_name(name) {
            continue;
        }

        // Case-insensitive de-dup but keep the original casing of first sighting.
        let key = name.to_lowercase();
        if seen.insert(key) {
            out.push(name.to_string());
        }
    }

    out
}

/// If `line` is a chat-log line (`[ timestamp ] Name > message`), return the
/// character name part. Returns `None` when the line is not in that shape.
fn strip_chat_prefix(line: &str) -> Option<&str> {
    // Must start with the bracketed timestamp.
    let rest = line.strip_prefix('[')?;
    let close = rest.find(']')?;
    let after_ts = rest[close + 1..].trim_start();

    // Chat lines separate the speaker from the message with " > ".
    // The name is everything before the first '>'.
    let name = match after_ts.split_once('>') {
        Some((name, _msg)) => name.trim(),
        // A bracketed line with no '>' is not a normal chat message; ignore it
        // rather than mis-parsing (e.g. system notifications).
        None => return None,
    };

    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

/// Loose validation of an EVE character name. We deliberately err on the side of
/// accepting: ESI's `/universe/ids/` is the real authority and will simply not
/// return an id for a bogus name, so a false-positive here is cheap.
fn is_plausible_name(name: &str) -> bool {
    let len = name.chars().count();
    if !(NAME_MIN..=NAME_MAX).contains(&len) {
        return false;
    }

    // Reject obvious non-names: lines that are entirely punctuation/symbols, or
    // that contain characters EVE never allows in a character name.
    let mut has_alnum = false;
    for c in name.chars() {
        if c.is_alphanumeric() {
            has_alnum = true;
        } else if !matches!(c, ' ' | '-' | '\'') {
            return false;
        }
    }
    has_alnum && !name.starts_with(' ') && !name.ends_with(' ')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn member_list_one_name_per_line() {
        let input = "Alice Pilot\nBob Hauler\nCharlie Tackle\n";
        assert_eq!(
            parse_local(input),
            vec!["Alice Pilot", "Bob Hauler", "Charlie Tackle"]
        );
    }

    #[test]
    fn chat_log_lines_extract_speaker() {
        let input = "\
[ 2026.06.02 17:00:00 ] Alice Pilot > gf
[ 2026.06.02 17:00:05 ] Bob Hauler > warping out lol
[ 2026.06.02 17:01:00 ] Alice Pilot > shut up";
        // Alice appears twice but is de-duplicated.
        assert_eq!(parse_local(input), vec!["Alice Pilot", "Bob Hauler"]);
    }

    #[test]
    fn mixed_paste_is_tolerated() {
        let input = "\
Solo Roamer

[ 2026.06.02 17:00:00 ] Gate Camper > o7
Cyno Alt II";
        assert_eq!(
            parse_local(input),
            vec!["Solo Roamer", "Gate Camper", "Cyno Alt II"]
        );
    }

    #[test]
    fn dedup_is_case_insensitive_first_casing_wins() {
        let input = "BadDude\nbaddude\nBADDUDE";
        assert_eq!(parse_local(input), vec!["BadDude"]);
    }

    #[test]
    fn names_with_hyphen_and_apostrophe() {
        let input = "Ja'far al-Rashid\nX-Wing";
        assert_eq!(parse_local(input), vec!["Ja'far al-Rashid", "X-Wing"]);
    }

    #[test]
    fn rejects_too_short_and_symbol_only() {
        let input = "ab\n>>>\n---\n   \n\u{2588}\u{2588}\u{2588}";
        assert!(parse_local(input).is_empty());
    }

    #[test]
    fn system_speaker_is_extracted_then_filtered_downstream() {
        // We still extract the speaker; non-character speakers like "EVE System"
        // simply won't resolve to an id at the ESI step, so they cost nothing.
        let input = "[ 2026.06.02 17:00:00 ] EVE System > Channel changed to Local";
        assert_eq!(parse_local(input), vec!["EVE System"]);
    }

    #[test]
    fn bracketed_line_without_speaker_arrow_is_dropped() {
        // A bracketed line with no " > " is not a chat message; don't invent a name.
        let input = "[ Some bracketed banner with no arrow ]";
        assert!(parse_local(input).is_empty());
    }

    #[test]
    fn empty_input_yields_empty() {
        assert!(parse_local("").is_empty());
        assert!(parse_local("\n\n   \n").is_empty());
    }
}
