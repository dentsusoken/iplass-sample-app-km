/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.tag.entity;

import org.iplass.mtp.entity.GenericEntity;

/**
 * タグ Entity
 */
public class Tag extends GenericEntity {

	private static final long serialVersionUID = 1L;

	/** Entity 定義名 */
	public static final String DEFINITION_NAME = "km.tag.Tag";

	/** タグ名（unique）。標準の name は改変不可のため別プロパティとして保持する */
	public static final String TAG_NAME = "tagName";

	/** 説明 */
	public static final String DESCRIPTION = "description";

	public Tag() {
		setDefinitionName(DEFINITION_NAME);
	}

	/**
	 * タグ名を返します。
	 *
	 * @return タグ名
	 */
	public String getTagName() {
		return getValue(TAG_NAME);
	}

	/**
	 * タグ名を設定します。
	 *
	 * @param tagName タグ名
	 */
	public void setTagName(String tagName) {
		setValue(TAG_NAME, tagName);
	}

	/**
	 * 説明を返します。
	 *
	 * @return 説明
	 */
	@Override
	public String getDescription() {
		return getValue(DESCRIPTION);
	}

	/**
	 * 説明を設定します。
	 *
	 * @param description 説明
	 */
	@Override
	public void setDescription(String description) {
		setValue(DESCRIPTION, description);
	}
}
