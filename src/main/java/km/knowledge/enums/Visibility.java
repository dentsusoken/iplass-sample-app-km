/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.enums;

/**
 * ナレッジの公開範囲。
 */
public enum Visibility {

	/** 回答者のみ閲覧可。 */
	internal,

	/** public (全ユーザー閲覧可) */
	pub("public");

	private final String value;

	Visibility() {
		this.value = name();
	}

	Visibility(String value) {
		this.value = value;
	}

	/**
	 * Entity プロパティに保存される文字列値を返す。
	 */
	public String getValue() {
		return value;
	}

	/**
	 * 保存された文字列値から Visibility を解決する。
	 */
	public static Visibility fromValue(String value) {
		if ("public".equals(value)) {
			return pub;
		}
		if ("internal".equals(value)) {
			return internal;
		}
		throw new IllegalArgumentException("Unknown visibility: " + value);
	}
}
