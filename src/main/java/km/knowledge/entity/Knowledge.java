/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.entity;

import km.inquiry.entity.Inquiry;
import km.tag.entity.Tag;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;

/**
 * ナレッジ Entity
 */
public class Knowledge extends GenericEntity {

	private static final long serialVersionUID = 1L;

	/** Entity 定義名 */
	public static final String DEFINITION_NAME = "km.knowledge.Knowledge";

	/** ナレッジ文 */
	public static final String CONTENT = "content";
	/** 関連問合せ */
	public static final String RELATED_INQUIRIES = "relatedInquiries";
	/** タグ */
	public static final String TAGS = "tags";
	/** 公開範囲 */
	public static final String VISIBILITY = "visibility";
	/** マージ先ナレッジ（自参照 Reference、null = 未マージ） */
	public static final String MERGED_TO = "mergedTo";

	public Knowledge() {
		setDefinitionName(DEFINITION_NAME);
	}

	/**
	 * ナレッジ文を返します。
	 *
	 * @return ナレッジ文
	 */
	public String getContent() {
		return getValue(CONTENT);
	}

	/**
	 * ナレッジ文を設定します。
	 *
	 * @param content ナレッジ文
	 */
	public void setContent(String content) {
		setValue(CONTENT, content);
	}

	/**
	 * 関連問合せを返します。
	 *
	 * @return 関連問合せ
	 */
	public Inquiry[] getRelatedInquiries() {
		Object value = getValue(RELATED_INQUIRIES);
		if (value instanceof Inquiry) {
			return new Inquiry[] {(Inquiry) value}; // 検索結果は単一要素で返るため配列に包む
		} else {
			return (Inquiry[]) value; // load 時は配列で返る
		}
	}

	/**
	 * 関連問合せを設定します。
	 *
	 * @param relatedInquiries 関連問合せ
	 */
	public void setRelatedInquiries(Inquiry[] relatedInquiries) {
		setValue(RELATED_INQUIRIES, relatedInquiries);
	}

	/**
	 * タグを返します。
	 *
	 * @return タグ
	 */
	public Tag[] getTags() {
		Object value = getValue(TAGS);
		if (value instanceof Tag) {
			return new Tag[] {(Tag) value}; // 検索結果は単一要素で返るため配列に包む
		} else {
			return (Tag[]) value; // load 時は配列で返る
		}
	}

	/**
	 * タグを設定します。
	 *
	 * @param tags タグ
	 */
	public void setTags(Tag[] tags) {
		setValue(TAGS, tags);
	}

	/**
	 * 公開範囲を返します。
	 *
	 * @return 公開範囲
	 */
	public SelectValue getVisibility() {
		return getValue(VISIBILITY);
	}

	/**
	 * 公開範囲を設定します。
	 *
	 * @param visibility 公開範囲
	 */
	public void setVisibility(SelectValue visibility) {
		setValue(VISIBILITY, visibility);
	}

	/**
	 * マージ先ナレッジを返します。null の場合は未マージ。
	 *
	 * @return マージ先ナレッジ
	 */
	public Knowledge getMergedTo() {
		return getValue(MERGED_TO);
	}

	/**
	 * マージ先ナレッジを設定します。null クリアで未マージに戻す。
	 *
	 * @param mergedTo マージ先ナレッジ
	 */
	public void setMergedTo(Knowledge mergedTo) {
		setValue(MERGED_TO, mergedTo);
	}
}
