/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.entity;

import org.iplass.mtp.entity.BinaryReference;
import org.iplass.mtp.entity.GenericEntity;

/**
 * 投稿 Entity
 * 問合せEntity の posts プロパティから参照される（親子関係）
 */
public class Post extends GenericEntity {

	private static final long serialVersionUID = 1L;

	/** Entity 定義名 */
	public static final String DEFINITION_NAME = "km.inquiry.Post";

	/** 投稿文 */
	public static final String CONTENT = "content";
	/** 添付ファイル */
	public static final String ATTACHMENTS = "attachments";

	public Post() {
		setDefinitionName(DEFINITION_NAME);
	}

	/**
	 * 投稿文を返します。
	 *
	 * @return 投稿文
	 */
	public String getContent() {
		return getValue(CONTENT);
	}

	/**
	 * 投稿文を設定します。
	 *
	 * @param content 投稿文
	 */
	public void setContent(String content) {
		setValue(CONTENT, content);
	}

	/**
	 * 添付ファイルを返します。
	 *
	 * @return 添付ファイル
	 */
	public BinaryReference[] getAttachments() {
		Object value = getValue(ATTACHMENTS);
		if (value instanceof BinaryReference) {
			return new BinaryReference[] {(BinaryReference) value}; // 検索結果は単一要素で返るため配列に包む
		} else {
			return (BinaryReference[]) value; // load 時は配列で返る
		}
	}

	/**
	 * 添付ファイルを設定します。
	 *
	 * @param attachments 添付ファイル
	 */
	public void setAttachments(BinaryReference[] attachments) {
		setValue(ATTACHMENTS, attachments);
	}
}
